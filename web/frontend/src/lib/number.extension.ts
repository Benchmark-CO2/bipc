Object.defineProperty(Number.prototype, "toInternational", {
  value: function (locale: string = "pt-BR", decimals: number = 1) {
    if (!this) return 0;
    if (isNaN(this)) {
      return 0;
    }
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(this);
    } catch (error) {
      console.error(error);
      return this.toString();
    }
  },
});
