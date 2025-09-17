// modules/keyvault.bicep
param name string
param location string
param enablePurgeProtection bool = false

resource kv 'Microsoft.KeyVault/vaults@2021-06-01-preview' = {
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
    enabledForTemplateDeployment: false
    enabledForDiskEncryption: false
    enableSoftDelete: true
    enablePurgeProtection: enablePurgeProtection
  }
  tags: {
    project: 'ehms'
  }
}

output vaultName string = kv.name
output vaultResourceId string = kv.id