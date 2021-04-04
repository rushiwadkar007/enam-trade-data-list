const { Requester, Validator } = require('@chainlink/external-adapter')
const qs = require('querystring')

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  apmcName: ['apmcName'],
  commodityName: ['commodityName'],
  fromDate: ['fromDate'],
  language: ['language'],
  toDate: ['toDate'],
  stateName: ['stateName'],
  endpoint: false
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const apmcName = validator.validated.data.apmcName
  const commodityName = validator.validated.data.commodityName
  const fromDate = validator.validated.data.fromDate
  const language = validator.validated.data.language
  const toDate = validator.validated.data.toDate
  const stateName = validator.validated.data.stateName

  const data = qs.stringify({
    apmcName,
    commodityName,
    fromDate,
    toDate,
    language,
    stateName
  })

  const url = 'https://enam.gov.in/web/Ajax_ctrl/trade_data_list'
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  const config = {
    method: 'post',
    url,
    headers,
    data
  }
  Requester.request(config, customError)
    .then((response) => {
      response.data.result = Requester.validateResultNumber(response.data, ['data', 'data[0]', 'commodity'])
      callback(200, Requester.success(jobRunID, response.data))
    })
    .catch((error) => {
      console.log(error)
      const obj = callback(500, Requester.errored(jobRunID, error))
      return obj.data
    })
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
