const { EventEmitter } = require('events');

class FaultChangeNotifier extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  notify(change = {}) {
    this.emit('change', {
      ...change,
      changedAt: new Date().toISOString()
    });
  }
}

module.exports = new FaultChangeNotifier();
