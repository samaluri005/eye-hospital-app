// modules/postgres-flexible.bicep
@description('Flexible Server name')
param serverName string
param location string
param adminUser string
@secure()
param adminPassword string
param skuName string = 'Standard_B1ms'
param storageGb int = 128
param allowedClientIp string = '0.0.0.0'

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: serverName
  location: location
  properties: {
    administratorLogin: adminUser
    administratorLoginPassword: adminPassword
    version: '14'
    storage: {
      storageSizeGB: storageGb
    }
    network: {
      delegatedSubnetResourceId: '' // leave blank for public access; replace with subnet resourceId for private endpoints
    }
    highAvailability: {
      mode: 'Disabled'
    }
    createMode: 'Default'
  }
  sku: {
    name: skuName
    tier: 'Burstable'
  }
  tags: {
    project: 'ehms'
  }
}

resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = {
  parent: pg
  name: 'allowclient'
  properties: {
    startIpAddress: allowedClientIp
    endIpAddress: allowedClientIp
  }
}

output serverName string = pg.name
output fullyQualifiedDomainName string = pg.properties.fullyQualifiedDomainName
output resourceId string = pg.id