'use strict';

const i2c = require('i2c-bus'),
  util = require('util');

const i2cAddress = {
  DEFAULT_ADDRESS: 0x1D,
  GNT_ADDRESS: 0x1C
};

const registers = {
  OUT_X_MSB: 0x01,
  SYSMOD: 0x0B,
  WHOAMI: 0x0D,
  XYZ_DATA_CFG: 0x0E,
  PL_STATUS: 0x10,
  PL_CFG: 0x11,
  CTRL_REG1: 0x2A,
  CTRL_REG2: 0x2B,
  CTRL_REG4: 0x2D,
  CTRL_REG5: 0x2E
};

const RANGE_4G = 0b01; // +/- 4g.  Must be this if using low noise

module.exports.registers = registers;
module.exports.i2cAddress = i2cAddress;

module.exports.MMA8541 = class MMA8541 {
  constructor(i2cAddress) {
    this.i2cAddress = i2cAddress || i2cAddress.DEFAULT_ADDRESS;
    this.deviceId = 0x0;
    this.i2cBus = i2c.openSync(1);
  }

  _readRegister(reg) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readByte(this.i2cAddress, reg, (err, byte) => {
        if (err) return reject(err);
        return resolve(byte);
      })
    });
  }

  _writeRegister(reg, byte) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readByte(this.i2cAddress, reg, byte, (err) => {
        if (err) return reject(err);
        return true;
      })
    });
  }

  async init() {
    this.deviceId = await this._readRegister(registers.WHOAMI);
    console.log(Buffer(this.deviceId).toString('hex'));
  }
};
