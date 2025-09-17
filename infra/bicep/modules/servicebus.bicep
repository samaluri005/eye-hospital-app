// modules/servicebus.bicep
param namespaceName string
param location string
param sku string = 'Standard'
param topics array = []

resource sb 'Microsoft.ServiceBus/namespaces@2021-11-01' = {
  name: namespaceName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    isAutoInflateEnabled: false
    zoneRedundant: false
  }
  tags: {
    project: 'ehms'
  }
}

var topicResources = [for t in topics: {
  name: t
  dependsOn: [
    sb
  ]
}]

resource topicsRes 'Microsoft.ServiceBus/namespaces/topics@2021-11-01' = [for (t, i) in topics: {
  parent: sb
  name: t
  properties: {
    defaultMessageTimeToLive: 'P14D'
    maxSizeInMegabytes: 1024
  }
}]

resource authRule 'Microsoft.ServiceBus/namespaces/authorizationRules@2021-11-01' = {
  parent: sb
  name: 'RootManageSharedAccessKey'
  properties: {
    rights: [
      'Listen'
      'Send'
      'Manage'
    ]
  }
}

output namespaceName string = sb.name
output namespaceResourceId string = sb.id
output primaryConnectionString string = listKeys(authRule.id, '2021-11-01').primaryConnectionString