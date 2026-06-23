import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const createLoggerOptions = (): pino.LoggerOptions => {
  const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

  if (isProduction) {
    return { level };
  }

  try {
    require.resolve('pino-pretty');

    return {
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };
  } catch {
    return { level };
  }
};

const logger = pino(createLoggerOptions());

export default logger;
