Object.defineProperty(Number.prototype, 'toInternational', {
  value: function(locale: string = 'pt-BR', decimals: number = 1) {
    if (!this) return this
    if (isNaN(this)) {
      return 0;
    }
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(this);
  },
});

