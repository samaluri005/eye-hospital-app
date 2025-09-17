#!/usr/bin/env bash
# infra/setup-dev-azure.sh
# Purpose: Provision a dev Azure environment for the Eye Hospital Management System.
# Creates: resource group, key vault, service bus namespace + topics, postgres flexible server,
#          service principal, role assignments, stores secrets in Key Vault.
#
# Usage:
#   ./infra/setup-dev-azure.sh --prefix ehmsdev --location eastus
#   or simply: ./infra/setup-dev-azure.sh
#
# Requirements:
# - az CLI logged in (az login)
# - jq (optional, used for JSON parsing)
# - you must run this with an account that can create resources in the subscription
#
set -euo pipefail

# -------------------------
# Parameters (can override)
# -------------------------
PREFIX="ehms"
LOCATION="eastus"
RG_NAME=""
KV_NAME=""
SB_NAME=""
PG_NAME=""
SP_NAME=""
ADMIN_PWD=""
ALLOWED_IP=""

# helper: print usage
usage() {
  cat <<EOF
Usage: $0 [--prefix <prefix>] [--location <location>] [--admin-password <pg-password>] [--allowed-ip <your-ip>]

--prefix            prefix for resource names (default: $PREFIX)
--location          Azure region (default: $LOCATION)
--admin-password    optional Postgres admin password (will prompt if not provided)
--allowed-ip        Public IP to allow for Postgres firewall (default: detected public IP)
EOF
  exit 1
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2 ;;
    --location) LOCATION="$2"; shift 2 ;;
    --admin-password) ADMIN_PWD="$2"; shift 2 ;;
    --allowed-ip) ALLOWED_IP="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

# defaults & derived names
UNIQ=$(openssl rand -hex 3) # small unique suffix
RG_NAME="${PREFIX}-rg-${UNIQ}"
KV_NAME="${PREFIX}KeyVault${UNIQ}"
SB_NAME="${PREFIX}sb${UNIQ}"
PG_NAME="${PREFIX}pg${UNIQ}"
SP_NAME="${PREFIX}-dev-sp-${UNIQ}"

# detect public IP if not provided
if [[ -z "$ALLOWED_IP" ]]; then
  if command -v curl >/dev/null 2>&1; then
    ALLOWED_IP=$(curl -s https://ipinfo.io/ip || true)
  fi
  if [[ -z "$ALLOWED_IP" ]]; then
    echo "Couldn't detect public IP automatically. Please re-run with --allowed-ip <YOUR_IP>"
    exit 1
  fi
fi

# prompt for postgres admin pwd if not provided
if [[ -z "$ADMIN_PWD" ]]; then
  echo "Enter a strong password for the Postgres admin user (will not be stored in repo): "
  read -s ADMIN_PWD
  echo
fi

echo "Using:"
echo "  Resource group: $RG_NAME"
echo "  KeyVault: $KV_NAME"
echo "  ServiceBus namespace: $SB_NAME"
echo "  Postgres server: $PG_NAME"
echo "  Service Principal: $SP_NAME"
echo "  Location: $LOCATION"
echo "  Postgres allowed IP: $ALLOWED_IP"
echo

# confirm interactive az login
if ! az account show >/dev/null 2>&1; then
  echo "You must 'az login' before running this script. Run: az login"
  exit 1
fi

# 1) Create resource group (idempotent)
echo "Creating resource group..."
az group create --name "$RG_NAME" --location "$LOCATION" >/dev/null
echo "Resource group ready."

# 2) Create Key Vault (if missing)
echo "Creating or updating Key Vault: $KV_NAME..."
if az keyvault show --name "$KV_NAME" >/dev/null 2>&1; then
  echo "Key Vault $KV_NAME already exists."
else
  az keyvault create --name "$KV_NAME" --resource-group "$RG_NAME" --location "$LOCATION" >/dev/null
  echo "Key Vault created."
fi

# 3) Create Service Bus namespace
echo "Creating Service Bus namespace: $SB_NAME..."
if az servicebus namespace show --name "$SB_NAME" --resource-group "$RG_NAME" >/dev/null 2>&1; then
  echo "Service Bus namespace $SB_NAME already exists."
else
  az servicebus namespace create --resource-group "$RG_NAME" --name "$SB_NAME" --location "$LOCATION" --sku Standard >/dev/null
  echo "Service Bus namespace created."
fi

# create topics
TOPICS=("appointments-topic" "notifications-topic" "billing-topic")
for t in "${TOPICS[@]}"; do
  echo "Creating topic $t..."
  az servicebus topic create --resource-group "$RG_NAME" --namespace-name "$SB_NAME" --name "$t" >/dev/null
done
echo "Topics created."

# 4) Create Postgres Flexible Server (idempotent-ish)
echo "Creating Azure Database for PostgreSQL (Flexible Server): $PG_NAME ..."
if az postgres flexible-server show --name "$PG_NAME" --resource-group "$RG_NAME" >/dev/null 2>&1; then
  echo "Postgres server $PG_NAME already exists."
else
  az postgres flexible-server create \
    --name "$PG_NAME" \
    --resource-group "$RG_NAME" \
    --location "$LOCATION" \
    --admin-user "${PREFIX}admin" \
    --admin-password "$ADMIN_PWD" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --storage-size 128 \
    --public-access 0.0.0.0 # we'll add firewall rule explicitly below
  echo "Postgres server created."
fi

# Add firewall rule for current IP
echo "Adding firewall rule for IP: $ALLOWED_IP"
az postgres flexible-server firewall-rule create --resource-group "$RG_NAME" --name "$PG_NAME" --rule-name allowClientIP --start-ip-address "$ALLOWED_IP" --end-ip-address "$ALLOWED_IP" >/dev/null
echo "Firewall rule added."

# 5) Create Service Principal (scoped for dev)
echo "Creating service principal (app) for local dev: $SP_NAME"
SP_JSON=$(az ad sp create-for-rbac --name "$SP_NAME" --query "{appId:appId,password:password,tenant:tenant}" -o json)
SP_APP_ID=$(echo "$SP_JSON" | jq -r '.appId')
SP_PWD=$(echo "$SP_JSON" | jq -r '.password')
SP_TENANT=$(echo "$SP_JSON" | jq -r '.tenant')
echo "Service principal created: appId=$SP_APP_ID tenant=$SP_TENANT"

# 6) Assign Key Vault secret permissions to the service principal (RBAC)
echo "Granting Key Vault secret GET/list permissions to service principal..."
KV_RESOURCE_ID=$(az keyvault show --name "$KV_NAME" --resource-group "$RG_NAME" --query id -o tsv)
az role assignment create --assignee "$SP_APP_ID" --role "Key Vault Secrets User" --scope "$KV_RESOURCE_ID" >/dev/null
echo "Key Vault RBAC role assigned."

# 7) Assign Service Bus Data Sender role to service principal scoped to the namespace
echo "Assigning 'Azure Service Bus Data Sender' role to SP for the Service Bus namespace..."
SB_RESOURCE_ID=$(az servicebus namespace show --resource-group "$RG_NAME" --name "$SB_NAME" --query id -o tsv)
az role assignment create --assignee "$SP_APP_ID" --role "Azure Service Bus Data Sender" --scope "$SB_RESOURCE_ID" >/dev/null
echo "Role assignment complete."

# 8) Obtain Service Bus connection string & store in Key Vault
echo "Getting Service Bus connection string (RootManageSharedAccessKey)..."
SBCONN=$(az servicebus namespace authorization-rule keys list --resource-group "$RG_NAME" --namespace-name "$SB_NAME" --name RootManageSharedAccessKey --query primaryConnectionString -o tsv)
echo "Storing SERVICE_BUS_CONN in Key Vault..."
az keyvault secret set --vault-name "$KV_NAME" --name "SERVICE_BUS_CONN" --value "$SBCONN" >/dev/null
echo "Stored SERVICE_BUS_CONN."

# 9) Build Postgres connection string and store it
PG_ADMIN_USER="${PREFIX}admin"
PG_HOST=$(az postgres flexible-server show --resource-group "$RG_NAME" --name "$PG_NAME" --query fullyQualifiedDomainName -o tsv)
PG_CONN="postgres://${PG_ADMIN_USER}:${ADMIN_PWD}@${PG_HOST}:5432/${PREFIX}db?sslmode=require"
echo "Storing POSTGRES_CONN in Key Vault..."
az keyvault secret set --vault-name "$KV_NAME" --name "POSTGRES_CONN" --value "$PG_CONN" >/dev/null
echo "Stored POSTGRES_CONN."

# 10) Store Service Principal creds in Key Vault (for dev)
echo "Storing service principal credentials in Key Vault (dev use only)..."
az keyvault secret set --vault-name "$KV_NAME" --name "AZURE_CLIENT_ID" --value "$SP_APP_ID" >/dev/null
az keyvault secret set --vault-name "$KV_NAME" --name "AZURE_CLIENT_SECRET" --value "$SP_PWD" >/dev/null
az keyvault secret set --vault-name "$KV_NAME" --name "AZURE_TENANT_ID" --value "$SP_TENANT" >/dev/null
echo "Stored SP creds in Key Vault."

# 11) Output important info & next steps
echo
echo "===== DONE. IMPORTANT INFO ====="
echo "Resource group: $RG_NAME"
echo "Key Vault: $KV_NAME"
echo "Service Bus namespace: $SB_NAME"
echo "Postgres server: $PG_NAME (admin user: ${PG_ADMIN_USER})"
echo "Service Principal appId: $SP_APP_ID"
echo
echo "Secrets stored in Key Vault (names):"
echo "  - SERVICE_BUS_CONN"
echo "  - POSTGRES_CONN"
echo "  - AZURE_CLIENT_ID"
echo "  - AZURE_CLIENT_SECRET"
echo "  - AZURE_TENANT_ID"
echo
cat <<EOF

NEXT STEPS (manual):
1) Create an Azure AD B2C tenant (via Azure Portal) and register two apps:
   - ehms-frontend (Redirect URI: http://localhost:3000/api/auth/callback/azure-ad-b2c or your Replit URL)
   - ehms-backend (for client_credentials if needed)
   NOTE: Copy Client IDs and Secrets into Key Vault or Replit secrets.

2) In your local dev environment (or Replit), either:
   a) 'az login' interactive (recommended for dev) then use DefaultAzureCredential in code to fetch Key Vault secrets;
   b) OR fetch secrets from Key Vault and set locally: e.g. export SERVICE_BUS_CONN="$(az keyvault secret show --vault-name $KV_NAME --name SERVICE_BUS_CONN -o tsv --query value)". For convenience you can create Replit secrets with these values (dev only).

3) In your microservices and frontends:
   - Use DefaultAzureCredential or the AZURE_CLIENT_* env vars (the script stored these SP credentials in the Key Vault).
   - Use the Key Vault secret names noted above to get connection strings.

4) For production:
   - Replace the service principal with Managed Identities.
   - Harden Postgres firewall / VNet and Key Vault access policies.
   - Do not store SP credentials in Key Vault as a convenience; instead use MSI or short-lived tokens.

Sample commands to retrieve secrets (locally):
  az keyvault secret show --vault-name $KV_NAME --name SERVICE_BUS_CONN --query value -o tsv
  az keyvault secret show --vault-name $KV_NAME --name POSTGRES_CONN --query value -o tsv

EOF

# Exit cleanly
exit 0