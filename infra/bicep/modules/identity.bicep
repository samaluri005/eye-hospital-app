// modules/identity.bicep
param name string
param location string

resource uai 'Microsoft.ManagedIdentity/userAssignedIdentities@2018-11-30' = {
  name: name
  location: location
}

output identityName string = uai.name
output identityPrincipalId string = uai.properties.principalId
output identityClientId string = uai.properties.clientId
output identityId string = uai.id