import request from 'request'
import config from './config'
import chalk from 'chalk'
import _ from 'lodash'
import fs from 'jsonfile'

/* istanbul ignore next */
module.exports = {
  submit: submit,
  getAll: getAll,
  getByName: getByName,
  showConfig: function () {
    console.log(chalk.blue(config.username))
  },
  getObjectFromKey: getObjectFromKey,
  get: get,
  getAllCatalogItems: getAllCatalogItems,
  getTemplate: getTemplate,
  sendRequest: sendRequest,
  updateTemplateData: updateTemplateData
}

function getAllCatalogItems (cb) {
  var options = {
    method: 'GET',
    agent: config.agent,
    url: `https://${config.hostname}/catalog-service/api/consumer/entitledCatalogItemViews?limit=1000`,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'authorization': `Bearer ${config.token.id}`
    },
    body: {},
    json: true
  }

  request.get(options, function (error, response, body) {
    if (error) {
      cb(error)
    }

    if (response.statusCode === 200) {
      let items = []
      body.content.forEach(function (item) {
        var res = {}
        res.name = item.name
        res.id = item.catalogItemId
        res.submitRequestUrl = item.links[1].href
        res.submitRequestUrlMethod = item.links[1].rel
        // res.catalogResourceLabel = item.catalogResource.label
        // res.catalogResourceId = item.catalogResource.id
        items.push(res)
      }, this)
      cb(null, JSON.stringify(items, null, 2))
    } else {
      cb(JSON.stringify(body))
    }
  })
}

function submit (deploymentOptions, cb) {
  module.exports.getByName(deploymentOptions.blueprintName, function (error, response) {
    if (error) {
      return cb(error, null)
    }

    var urlTemplate = response.links[0].href
    var urlRequest = response.links[1].href

    module.exports.getTemplate(urlTemplate, function (error, templateData) {
      if (error) {
        return cb(error, null)
      }

      module.exports.updateTemplateData(templateData, deploymentOptions, function (err, mergedTemplateData) {
        if (err) {
          return cb(error, null)
        }
        mergedTemplateData.data['y.Hostname.CID'] = deploymentOptions.clientId
        mergedTemplateData.data['y.Hostname.PID'] = deploymentOptions.projectId
        mergedTemplateData.data['_deploymentName'] = deploymentOptions.deploymentName
        mergedTemplateData.description = deploymentOptions.deploymentName
        module.exports.sendRequest(urlRequest, mergedTemplateData, function (error, response) {
          if (error) {
            return cb(error, null)
          }
          cb(null, response)
        })
      })
    })
  })
}

function getByName (name, cb) {
  var options = {
    method: 'GET',
    agent: config.agent,
    url: `https://${config.hostname}/catalog-service/api/consumer/entitledCatalogItemViews?limit=1000&$filter=(name eq '${name}')`,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'authorization': `Bearer ${config.token.id}`
    },
    body: {},
    json: true
  }

  request.get(options, function (error, response, body) {
    if (error) {
      return cb(error)
    }

    if (response.statusCode === 200) {
      cb(null, body.content[0])
    } else {
      cb(JSON.stringify(body, null, 2))
    }
  })
}

function updateTemplateData (templateData, deploymentOptions, callback) {
  if (!deploymentOptions.templateDataPath) {
    return callback(null, templateData)
  }
  fs.readFile(deploymentOptions.templateDataPath, (err, dataToBeMerged) => {
    if (err) {
      return callback(err, null)
    }

    var node
    if (deploymentOptions && dataToBeMerged) {
      dataToBeMerged.forEach(function (elem) {
        node = templateData
        if (elem.path.length > 0) {
          var properties = elem.path.split('.')
          properties.forEach(function (property) {
            node = node[property]
          })
        }
        node[elem.leaf] = elem.value
      })
    }
    callback(null, templateData)
  })
}

function getTemplate (url, cb) {
  var options = {
    method: 'GET',
    agent: config.agent,
    url: url,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'authorization': `Bearer ${config.token.id}`
    },
    body: {},
    json: true
  }

  request.get(options, function (error, response, body) {
    if (error) {
      return cb(error)
    }

    if (response.statusCode === 200) {
      cb(null, body)
    } else {
      cb(JSON.stringify(body, null, 2))
    }
  })
}

function sendRequest (url, data, cb) {
  var options = {
    method: 'POST',
    agent: config.agent,
    url: url,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'authorization': `Bearer ${config.token.id}`
    },
    body: data,
    json: true
  }

  request.post(options, function (error, response, body) {
    if (error) {
      return cb(error)
    }
    if (response.statusCode === 201) {
      cb(null, body)
    } else {
      cb(body)
    }
  })
}

function get (params, cb) {
  var options = {
    method: 'GET',
    agent: config.agent,
    url: `https://${config.hostname}/catalog-service/api/consumer/requests/${params.id}`,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'authorization': `Bearer ${config.token.id}`
    },
    json: true
  }

  request.get(options, function (error, response, body) {
    if (error) {
      return cb(error)
    }
    if (response.statusCode === 200) {
      var result = body
      if (params.raw === false) {
        result = {
          id: body.id,
          requestCompletion: body.requestCompletion
        }
      }
      cb(null, result)
    } else {
      cb(body)
    }
  })
}

function getAll (obj, cb) {
  var options = {
    method: 'GET',
    agent: config.agent,
    url: `https://${config.hostname}/catalog-service/api/consumer/requests/`,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'authorization': `Bearer ${config.token.id}`
    },
    json: true
  }

  request.get(options, function (error, response, body) {
    if (error) {
      return cb(error)
    }
    if (response.statusCode === 200) {
      cb(null, body)
    } else {
      cb(body)
    }
  })
}

function getObjectFromKey (jsonObject, key) {
  var indexCID = _.findIndex(jsonObject.entries, function (o) {
    return o.key === key
  })
  // 'key', 'y.Hostname.CID')
  if (indexCID === -1) {
    return null
  }
  return jsonObject.entries[indexCID]
}