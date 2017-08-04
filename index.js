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

const ctrlReg2Cmds = {
  RST: 0x40,
  HI_RES: 0x02
};

const RANGE_4G = 0b01; // +/- 4g.  Must be this if using low noise
const DEVICE_ID = 0x1A;

function uint16(msb, lsb) {
  return msb << 8 | lsb;
}

function int16(msb, lsb) {
  const val = uint16(msb, lsb);
  return val > 32767 ? (val - 65536) : val;
}

module.exports.registers = registers;
module.exports.i2cAddress = i2cAddress;
module.exports.ctrlReg2Cmds = ctrlReg2Cmds;

module.exports.MMA8541 = class MMA8541 {
  constructor(i2cAddress) {
    this.i2cAddress = i2cAddress || i2cAddress.DEFAULT_ADDRESS;
    this.i2cBus = i2c.openSync(1);
  }

  _readRegister(reg) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readByte(this.i2cAddress, reg, (err, byte) => {
        (err) ? reject(err): resolve(byte);
      })
    });
  }

  _writeRegister(reg, byte) {
    return new Promise((resolve, reject) => {
      this.i2cBus.writeByte(this.i2cAddress, reg, byte, (err) => {
        (err) ? reject(err): resolve(true);
      })
    });
  }

  _readBlock(reg) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readI2cBlock(this.i2cAddress, reg, 6, new Buffer(6), (err, bytesRead, buf) => {
        (err) ? reject(err): resolve(buf);
      })
    });
  }

  async init() {
    const id = await this._readRegister(registers.WHOAMI);
    if (DEVICE_ID !== id) {
      throw new Error('Could not detect MMA8451');
    }

    //reset the sensor and wait til its ready
    await this._writeRegister(registers.CTRL_REG2, ctrlReg2Cmds.RST);
    while (await this._readRegister(registers.CTRL_REG2) & ctrlReg2Cmds.RST);

    await this._writeRegister(registers.CTRL_REG2, ctrlReg2Cmds.HIGH_RES); //high resoultion

    // Data ready inturrupt enabled on INT1 (Interrupt is routed to INT1 pin)
    await this._writeRegister(registers.CTRL_REG4, 0x01);
    await this._writeRegister(registers.CTRL_REG5, 0x01);

    // Enable orientation config
    await this._writeRegister(registers.PL_CFG, 0x40);

    // Activate at max rate, low noise mode. Requires 4G mode
    await this._writeRegister(registers.XYZ_DATA_CFG, RANGE_4G);
    await this._writeRegister(registers.CTRL_REG1, 0x01 | 0x04);
  }

  async getAcceleration(gForce) { //Default is m/s²
    await this._writeRegister(registers.OUT_X_MSB, 0);
    const buffer = this._readBlock(registers.OUT_X_MSB);

    const x = int16(buffer[1], buffer[0]),
      y = int16(buffer[3], buffer[2]),
      z = int16(buffer[5], buffer[4]);

    resolve({
      x: gForce ? x / 2048 : x,
      y: gForce ? y / 2048 : y,
      z: gForce ? z / 2048 : z,
      units: gForce ? 'g' : 'm/s²'
    });
  }

  async getOrientation() {
    const o = await this._readRegister(registers.PL_STATUS) & 0x07;
    return o;
  }
};
