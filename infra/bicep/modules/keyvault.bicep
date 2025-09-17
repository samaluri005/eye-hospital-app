// modules/keyvault.bicep
param name string
param location string
param enablePurgeProtection bool = true

resource kv 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [] // we will set access policies after MI/SP creation outside this module in main or via role assignments
    enabledForDeployment: false
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: false
    enableRbacAuthorization: true
    enablePurgeProtection: enablePurgeProtection
  }
  tags: {
    project: 'ehms'
  }
}

output vaultName string = kv.name
output vaultResourceId string = kv.id