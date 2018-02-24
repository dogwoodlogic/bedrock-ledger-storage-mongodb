/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _ = require('lodash');
const async = require('async');
const blsMongodb = require('bedrock-ledger-storage-mongodb');
const helpers = require('./helpers');
const mockData = require('./mock.data');
const uuid = require('uuid/v4');

const exampleLedgerId = 'did:v1:' + uuid.v4();
const configEventTemplate = _.cloneDeep(mockData.events.config);
configEventTemplate.ledger = exampleLedgerId;

const configBlockTemplate = _.cloneDeep(mockData.configBlocks.alpha);
configBlockTemplate.event = [configEventTemplate];
configBlockTemplate.id = exampleLedgerId + '/blocks/1';

const eventBlockTemplate = _.cloneDeep(mockData.eventBlocks.alpha);

describe('State Machine Storage API', () => {
  let ledgerStorage;

  before(done => {
    const block = _.cloneDeep(configBlockTemplate);
    const meta = {};
    const options = {ledgerId: exampleLedgerId};

    async.auto({
      initStorage: callback => blsMongodb.add(
        meta, options, (err, storage) => {
          ledgerStorage = storage;
          callback(err, storage);
        }),
      blockHash: callback => helpers.testHasher(block, callback),
      eventHash: callback => helpers.testHasher(configEventTemplate, callback),
      addEvent: ['initStorage', 'eventHash', (results, callback) => {
        const meta = {
          consensus: true,
          consensusDate: Date.now(),
          eventHash: results.eventHash
        };
        ledgerStorage.events.add({event: configEventTemplate, meta}, callback);
      }],
      addConfigBlock: [
        'initStorage', 'blockHash', 'eventHash', (results, callback) => {
          // blockHash and consensus are normally created by consensus plugin
          block.blockHeight = 0;
          meta.blockHash = results.blockHash;
          meta.consensus = true;
          meta.consensusDate = Date.now();
          block.event = [results.eventHash];
          ledgerStorage.blocks.add({block, meta}, callback);
        }]
    }, done);
  });
  beforeEach(done => {
    // FIXME: Remove ledger
    done();
  });
  it('should get state machine object by id', done => {
    const blockTemplate = eventBlockTemplate;
    const eventTemplate = mockData.events.alpha;
    let operation1;
    let operation2;
    async.auto({
      create: callback => helpers.createBlocks(
        {blockTemplate, eventTemplate, blockNum: 2}, (err, result) => {
          operation1 = result.events[0].event.operation[0];
          operation2 = result.events[1].event.operation[0];
          callback(err, result);
        }),
      event: ['create', (results, callback) => {
        async.each(results.create.events, (e, callback) =>
          ledgerStorage.events.add(
            {event: e.event, meta: e.meta}, callback), callback);
      }],
      block: ['event', (results, callback) => {
        async.each(results.create.blocks, ({block, meta}, callback) =>
          ledgerStorage.blocks.add({block, meta}, callback), callback);
      }],
      get: ['block', 'event', (results, callback) => {
        ledgerStorage.stateMachine.get(operation1.record.id, callback);
      }],
      getTwo: ['get', (results, callback) => {
        ledgerStorage.stateMachine.get(operation2.record.id, callback);
      }],
      ensureObject: ['get', 'getTwo', (results, callback) => {
        const recordOne = results.get;
        should.exist(recordOne);
        should.exist(recordOne.object);
        should.exist(recordOne.object.id);
        should.exist(recordOne.meta);
        should.exist(recordOne.meta.blockHeight);
        // FIXME: should blockHeight equal the block that contains the event?
        // recordOne.meta.blockHeight.should.equal(1);
        recordOne.object.should.deep.equal(operation1.record);
        const recordTwo = results.getTwo;
        recordTwo.object.should.deep.equal(operation2.record);
        recordOne.meta.blockHeight.should.equal(2);
        callback();
      }]
    }, err => {
      assertNoError(err);
      done(err);
    });
  });
  it('should get two state machine objects from different blocks by id',
    done => {
    const blockTemplate = eventBlockTemplate;
    const eventTemplate = mockData.events.alpha;
    let operation1;
    let operation2;
    async.auto({
      create: callback => helpers.createBlocks(
        {blockTemplate, eventTemplate, blockNum: 2}, (err, result) => {
          operation1 = result.events[0].event.operation[0];
          operation2 = result.events[1].event.operation[0];
          callback(err, result);
        }),
      event: ['create', (results, callback) => {
        async.each(results.create.events, (e, callback) =>
          ledgerStorage.events.add(
            {event: e.event, meta: e.meta}, callback), callback);
      }],
      block: ['event', (results, callback) => {
        async.each(results.create.blocks, ({block, meta}, callback) =>
          ledgerStorage.blocks.add({block, meta}, callback), callback);
      }],
      get: ['block', 'event', (results, callback) => {
        ledgerStorage.stateMachine.get(operation1.record.id, callback);
      }],
      getTwo: ['get', (results, callback) => {
        ledgerStorage.stateMachine.get(operation2.record.id, callback);
      }],
      ensureObject: ['get', 'getTwo', (results, callback) => {
        const recordOne = results.get;
        should.exist(recordOne);
        should.exist(recordOne.object);
        should.exist(recordOne.object.id);
        should.exist(recordOne.meta);
        should.exist(recordOne.meta.blockHeight);
        // FIXME: should blockHeight equal the block that contains the event?
        // recordOne.meta.blockHeight.should.equal(1);
        recordOne.object.should.deep.equal(operation1.record);
        const recordTwo = results.getTwo;
        recordTwo.object.should.deep.equal(operation2.record);
        recordOne.meta.blockHeight.should.equal(2);
        callback();
      }],
      create2: ['ensureObject', (results, callback) => helpers.createBlocks(
        {blockTemplate, eventTemplate, blockNum: 2}, (err, result) => {
          operation1 = result.events[0].event.operation[0];
          operation2 = result.events[1].event.operation[0];
          callback(err, result);
        })],
      event2: ['create2', (results, callback) => {
        async.each(results.create2.events, (e, callback) =>
          ledgerStorage.events.add(
            {event: e.event, meta: e.meta}, callback), callback);
      }],
      block2: ['event2', (results, callback) => {
        async.each(results.create2.blocks, ({block, meta}, callback) =>
          ledgerStorage.blocks.add({block, meta}, callback), callback);
      }],
      get2: ['block2', 'event2', (results, callback) => {
        ledgerStorage.stateMachine.get(operation1.record.id, callback);
      }],
      getTwo2: ['get2', (results, callback) => {
        ledgerStorage.stateMachine.get(operation2.record.id, callback);
      }],
      ensureObject2: ['get2', 'getTwo2', (results, callback) => {
        const recordOne = results.get2;
        should.exist(recordOne);
        should.exist(recordOne.object);
        should.exist(recordOne.object.id);
        should.exist(recordOne.meta);
        should.exist(recordOne.meta.blockHeight);
        // FIXME: should blockHeight equal the block that contains the event?
        // recordOne.meta.blockHeight.should.equal(1);
        recordOne.object.should.deep.equal(operation1.record);
        const recordTwo = results.getTwo2;
        recordTwo.object.should.deep.equal(operation2.record);
        recordOne.meta.blockHeight.should.equal(2);
        callback();
      }]
    }, err => {
      assertNoError(err);
      done(err);
    });
  });
  it.skip('should get updated state machine object');
});
