'use strict';

const
  should = require('should'),
  sinon = require('sinon'),
  sandbox = sinon.sandbox.create(),
  Bluebird = require('bluebird'),
  Request = require('kuzzle-common-objects').Request,
  Kuzzle = require('../../../mocks/kuzzle.mock'),
  Notifier = require.main.require('lib/api/core/notifier');

describe('Test: notifier.notifyDocumentDelete', () => {
  let
    kuzzle,
    request,
    notification,
    mockupStorageEngineService = {
      id: undefined,

      get: function (inputRequest) {
        if (inputRequest._id === 'errorme') {
          return Bluebird.reject(new Error());
        }

        return Bluebird.resolve({_source: {}, _id: inputRequest.input.resource._id});
      }
    },
    notifier;

  before(() => {
    kuzzle = new Kuzzle();
    notifier = new Notifier(kuzzle);
  });

  beforeEach(() => {
    kuzzle.internalEngine.get.returns(Bluebird.resolve({}));
    return kuzzle.services.init({whitelist: []})
      .then(() => {
        kuzzle.services.list.storageEngine = mockupStorageEngineService ;
        notifier.notify = (rooms, r, n) => {
          should(r).be.exactly(request);
          notification.push(n);
        };
        notification = [];
        request = new Request({
          controller: 'document',
          action: 'delete',
          requestId: 'foo',
          collection: 'bar',
          body: {foo: 'bar'}
        });
      });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should do nothing if no id is provided', () => {
    return notifier.notifyDocumentDelete(request, [])
      .then(() => {
        should(notification.length).be.eql(0);
      });
  });

  it('should notify when a document has been deleted', () => {
    return notifier.notifyDocumentDelete(request, ['foobar'])
      .then(id => {
        should(id[0]).be.exactly('foobar');
        should(notification.length).be.eql(1);
        should(notification[0].scope).be.exactly('out');
        should(notification[0].action).be.exactly('delete');
        should(notification[0].state).be.exactly('done');
        should(notification[0]._id).be.exactly('foobar');
      });
  });


  it('should notify for each document when multiple document have been deleted', () => {
    var ids = ['foo', 'bar'];

    return notifier.notifyDocumentDelete(request, ids)
      .then(() => {
        should(notification.length).be.eql(ids.length);
        should(notification.map(n => n._id)).match(ids);
      });
  });
});
