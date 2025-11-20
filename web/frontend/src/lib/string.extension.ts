
Object.defineProperty(String.prototype, "fromInternational", {
  value: function () {
    if (isNaN(parseFloat(this))) {
      return NaN;
    }
    const [number, decimals] = this.toString().split(",");
    return parseFloat(`${number.replace(".", "")}.${decimals}`);
  },
});

Object.defineProperty(String.prototype, "toInternational", {
  value: function (locale: string = "pt-BR", decimals: number = 1) {
    const parseToFloat = parseFloat(this);

    if (isNaN(parseToFloat)) {
      return 0;
    }
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(parseToFloat);
    } catch (error) {
      console.error(error);
      return parseToFloat.toString();
    }
  },
});
