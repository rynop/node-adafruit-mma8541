'use strict';

const i2c = require('i2c-bus'),
  util = require('util'),
  writeByte = util.promisify(i2c.writeByte),
  readByte = util.promisify(i2c.readByte);

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
  }

  async _readRegister(reg) {
    // await writeByte(this.i2cAddress, reg, 0);
    return await readByte(this.i2cAddress, reg);
  }

  async _writeRegister(reg, byte) {
    return await writeByte(this.i2cAddress, reg, byte);
  }

  init() {
    this.deviceId = await _readRegister(registers.WHOAMI);
    console.log(this.deviceId);
  }
};
