/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
if (!process.env.__ALREADY_BOOTSTRAPPED_ENVS) require('dotenv').config();

const fs = require('fs');
const { createServer } = require('@app-core/server');
const { createConnection } = require('@app-core/mongoose');
const { createQueue } = require('@app-core/queue');
const { appLogger } = require('@app-core/logger');
const { ensureDatabaseInMongoUri } = require('./utils/mongo-uri');

const canLogEndpointInformation = process.env.CAN_LOG_ENDPOINT_INFORMATION;
const mongoUri = ensureDatabaseInMongoUri(process.env.MONGODB_URI);

const ENDPOINT_CONFIGS = [
  {
    path: './endpoints/onboarding/',
  },
  {
    path: './endpoints/creator-cards/',
  },
];

function logEndpointMetaData(endpointConfigs) {
  const endpointData = [];
  const storageDirName = './endpoint-data';
  const EXEMPTED_ENDPOINTS_REGEX = /onboarding/;

  endpointConfigs.forEach((endpointConfig) => {
    const { path: basePath, options } = endpointConfig;

    const dirs = fs.readdirSync(basePath);

    dirs.forEach((file) => {
      const handler = require(`${basePath}${file}`);

      if (!EXEMPTED_ENDPOINTS_REGEX.test(basePath) && handler.middlewares?.length) {
        const entry = { method: handler.method, endpoint: handler.path };
        entry.name = file.replaceAll('-', ' ').replace('.js', '');
        entry.display_name = `can ${entry.name}`;

        if (options?.pathPrefix) {
          entry.endpoint = `${options.pathPrefix}${entry.endpoint}`;
          entry.name = `${entry.name} (${options.pathPrefix.replace('/', '')})`;
        }

        endpointData.push(entry);
      }
    });
  });

  if (!fs.existsSync(storageDirName)) {
    fs.mkdirSync(storageDirName);
  }

  fs.writeFileSync(`${storageDirName}/endpoints.json`, JSON.stringify(endpointData, null, 2), {
    encoding: 'utf-8',
  });
}

function setupEndpointHandlers(server, basePath, options = {}) {
  const dirs = fs.readdirSync(basePath);

  dirs.forEach((file) => {
    const handler = require(`${basePath}${file}`);

    if (options.pathPrefix) {
      handler.path = `${options.pathPrefix}${handler.path}`;
    }

    server.addHandler(handler);
  });
}

async function connectMongo() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  const result = await createConnection({ uri: mongoUri });

  if (!result.connection) {
    throw new Error('MongoDB connection was not established');
  }

  appLogger.info({}, 'mongodb-connected');
}

async function startApp() {
  try {
    await connectMongo();

    Promise.resolve(createQueue()).catch((err) => {
      appLogger.error({ error: err.message }, 'queue-init-failed');
    });

    const server = createServer({
      port: process.env.PORT,
      JSONLimit: '150mb',
      enableCors: true,
    });

    if (canLogEndpointInformation) {
      logEndpointMetaData(ENDPOINT_CONFIGS);
    }

    ENDPOINT_CONFIGS.forEach((config) => {
      setupEndpointHandlers(server, config.path, config.options);
    });

    server.startServer();
    appLogger.info({ port: process.env.PORT || 8811 }, 'server-started');
  } catch (error) {
    appLogger.errorX(error, 'app-startup-failed');
    process.exit(1);
  }
}

startApp();
