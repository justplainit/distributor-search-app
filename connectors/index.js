/**
 * Connector registry
 * Maps supplier types to connector classes
 */
const MustekConnector = require('./MustekConnector');
const AxizConnector = require('./AxizConnector');
const TarsusConnector = require('./TarsusConnector');
const BaseConnector = require('./BaseConnector');

const connectors = {
  mustek: MustekConnector,
  axiz: AxizConnector,
  tarsus: TarsusConnector,
  // Add more connectors here as they're implemented
};

/**
 * Get connector instance for a supplier
 */
function getConnector(supplierConfig) {
  const ConnectorClass = connectors[supplierConfig.slug] || BaseConnector;
  return new ConnectorClass(supplierConfig);
}

/**
 * Register a new connector
 */
function registerConnector(slug, ConnectorClass) {
  connectors[slug] = ConnectorClass;
}

module.exports = {
  getConnector,
  registerConnector,
  connectors,
};

