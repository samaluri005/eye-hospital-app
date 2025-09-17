// main.bicep
// Deploys Log Analytics, Key Vault, Service Bus, Postgres Flexible Server, and a user-assigned MI.
// Keep B2C and Conditional Access manual (portal/Graph) steps separate - see notes in README.

@description('Deployment prefix - used to derive resource names (lowercase, no special chars).')
param prefix string

@description('Azure region')
param location string = resourceGroup().location

@description('Postgres admin username (will be appended with prefix).')
param pgAdminUser string = '${toLower(prefix)}admin'

@description('Postgres admin password (supply via secure param file or pipeline secret).')
@secure()
param pgAdminPassword string

@description('Allowlist IP address for dev Postgres firewall. Use 0.0.0.0/0 for all (not recommended).')
param allowedClientIp string = '0.0.0.0'

@description('Enable Key Vault purge protection (irreversible).')
param enableKeyVaultPurgeProtection bool = false

@description('Service Bus SKU: Basic/Standard/Premium')
param serviceBusSku string = 'Standard'

@description('Postgres SKU - e.g. Standard_B1ms')
param postgresSkuName string = 'Standard_B1ms'

@description('Postgres storage GB')
param postgresStorageGB int = 128

// derive safe names (consumer should pass safe prefix)
var safePrefix = toLower(replace(prefix, '\\s', ''))
var uniq = uniqueString(resourceGroup().id, safePrefix)
var kvName = '${safePrefix}kv${take(uniq,6)}' // keep short
var laName = '${safePrefix}-la-${take(uniq,4)}'
var sbName = '${safePrefix}sb${take(uniq,6)}'
var pgName = '${safePrefix}pg${take(uniq,6)}'
var miName = '${safePrefix}-mi-${take(uniq,4)}'

resource la 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: laName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
  }
  tags: {
    project: 'ehms'
  }
}

module keyvaultModule 'modules/keyvault.bicep' = {
  name: 'kvDeploy'
  params: {
    name: kvName
    location: location
    enablePurgeProtection: enableKeyVaultPurgeProtection
  }
}

module sbModule 'modules/servicebus.bicep' = {
  name: 'sbDeploy'
  params: {
    namespaceName: sbName
    location: location
    sku: serviceBusSku
    topics: [
      'appointments-topic'
      'notifications-topic'
      'billing-topic'
    ]
  }
}

module miModule 'modules/identity.bicep' = {
  name: 'miDeploy'
  params: {
    name: miName
    location: location
  }
}

module pgModule 'modules/postgres-flexible.bicep' = {
  name: 'pgDeploy'
  params: {
    serverName: pgName
    location: location
    adminUser: pgAdminUser
    adminPassword: pgAdminPassword
    skuName: postgresSkuName
    storageGb: postgresStorageGB
    allowedClientIp: allowedClientIp
  }
}

// Diagnostic settings will be configured separately if needed

output keyVaultName string = keyvaultModule.outputs.vaultName
output keyVaultResourceId string = keyvaultModule.outputs.vaultResourceId
output serviceBusNamespace string = sbModule.outputs.namespaceName
output serviceBusResourceId string = sbModule.outputs.namespaceResourceId
output postgresServerName string = pgModule.outputs.serverName
output postgresFqdn string = pgModule.outputs.fullyQualifiedDomainName
output managedIdentityName string = miModule.outputs.identityName
output logAnalyticsWorkspaceId string = la.id