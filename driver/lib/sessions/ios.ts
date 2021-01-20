// @ts-ignore
import XCUITestDriver from 'appium-xcuitest-driver';
import { spawn } from 'child_process';
import { log } from '../logger';
import { connectSocket, processLogToGetobservatory } from './observatory';

const setupNewIOSDriver = async (caps) => {
  const iosArgs = {
    javascriptEnabled: true,
  };

  const iosdriver = new XCUITestDriver(iosArgs);
  const capsCopy = Object.assign({}, caps, { newCommandTimeout: 0 });
  await iosdriver.createSession(capsCopy);

  return iosdriver;
};

export const startIOSSession = async (caps) => {
  log.info(`Starting an IOS proxy session`);
  const iosdriver = await setupNewIOSDriver(caps);
  const observatoryWsUri = getObservatoryWsUri(iosdriver);
  return Promise.all([
    iosdriver,
    connectSocket(observatoryWsUri, caps.retryBackoffTime, caps.maxRetryCount),
  ]);
};

export const getObservatoryWsUri = (proxydriver) => {
  const urlObject = processLogToGetobservatory(proxydriver.logs.syslog.logs);
  const { udid, realDevice } = proxydriver.opts;
  if (realDevice) {
    // @todo check if `brew install usbmuxd` is needed
    log.info(`Running on iOS real device, doing "iproxy" now`);
    const args = [`${urlObject.port}:${urlObject.port}`, "-u", udid];
    log.debug(`Executing iproxy ${urlObject.port}:${urlObject.port} -u ${udid}`);
    const cmd = spawn(`iproxy`, args);
    cmd.stderr.on('data', (data) => {
      log.error(`iproxy stderr: ${data}`);
    });
  } else {
    log.info(`Running on iOS simulator, no "iproxy" needed`);
  }

  return urlObject.toJSON();
};
