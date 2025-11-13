Object.defineProperty(String.prototype, 'fromInternational', {
  value: function() {
    if (isNaN(parseFloat(this))) {
      return NaN;
    }
    const [number, decimals] = this.toString().split(',');
    return parseFloat(`${number.replace('.', '')}.${decimals}`);
  },
});