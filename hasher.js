
var tabs = {
  hash : 1,
  hmac : 2,
  crc : 3,
  cipher : 4,
  net : 5,
  time : 6,
  encode : 7,
  number : 8,
  string : 9
};

/*
 *  All IANA time zone names (for Time tab dropdown)
 */
function getTimeZones() {
  if (typeof Intl !== "undefined" && Intl.supportedValuesOf) {
    try {
      return Intl.supportedValuesOf("timeZone").sort();
    } catch (e) {}
  }
  return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"].sort();
}

/* Pinned timezones at top of IN TIMEZONE list (display name, IANA id) */
var timeZonePinned = [
  { name: "New York", id: "America/New_York" },
  { name: "Los Angeles", id: "America/Los_Angeles" },
  { name: "London", id: "Europe/London" },
  { name: "Paris", id: "Europe/Paris" },
  { name: "Sydney", id: "Australia/Sydney" },
  { name: "Auckland", id: "Pacific/Auckland" },
  { name: "Jerusalem", id: "Asia/Jerusalem" }
];

function getOffsetString(tz) {
  try {
    var date = new Date();
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      timeZoneName: "longOffset"
    }).formatToParts(date);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "timeZoneName") {
        var v = parts[i].value;
        var m = v.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
        if (m) {
          var pad2 = function (s) { return (String(s).length < 2) ? "0" + s : s; };
          return "UTC" + m[1] + pad2(m[2]) + ":" + pad2(m[3] || "0");
        }
        return "UTC+00:00";
      }
    }
  } catch (e) {}
  return "";
}

function getOffsetMinutes(tz) {
  try {
    var date = new Date();
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      timeZoneName: "longOffset"
    }).formatToParts(date);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "timeZoneName") {
        var v = parts[i].value;
        var m = v.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
        if (m) {
          var h = parseInt(m[2], 10) || 0;
          var min = parseInt(m[3], 10) || 0;
          var sign = m[1] === "-" ? -1 : 1;
          return sign * (h * 60 + min);
        }
        return 0;
      }
    }
  } catch (e) {}
  return 0;
}

/* Build list for IN TIMEZONE select: pinned first (with display name + offset), then rest by offset (id + offset) */
function getTimeZonesForSelect() {
  var all = getTimeZones();
  var pinnedIds = {};
  var result = [];
  for (var p = 0; p < timeZonePinned.length; p++) {
    pinnedIds[timeZonePinned[p].id] = true;
    var off = getOffsetString(timeZonePinned[p].id);
    result.push({
      value: timeZonePinned[p].id,
      label: timeZonePinned[p].name + (off ? " (" + off + ")" : "")
    });
  }
  var rest = [];
  for (var r = 0; r < all.length; r++) {
    if (!pinnedIds[all[r]]) rest.push(all[r]);
  }
  rest.sort(function (a, b) {
    return getOffsetMinutes(a) - getOffsetMinutes(b);
  });
  for (var j = 0; j < rest.length; j++) {
    var off = getOffsetString(rest[j]);
    result.push({
      value: rest[j],
      label: rest[j] + (off ? " (" + off + ")" : "")
    });
  }
  return result;
}

function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  } catch (e) {
    return "local";
  }
}

/* Order of outputs in the Time tab */
var timeTabOrder = ["time5local", "time5", "time6", "timeTsUtc"];

/* Detect if numeric input looks like milliseconds (12–13 digits, reasonable date range) */
function timeInputLooksLikeMs(input) {
  var t = (input || "").trim();
  if (!/^\d+$/.test(t)) return false;
  var n = parseInt(t, 10);
  return n >= 1e12 && n <= 2e13;
}

/* Format date as ISO 8601 in a given timezone (YYYY-MM-DDTHH:mm:ss±HH:mm) */
function formatDateISO8601InTZ(date, tz) {
  try {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(date);
    var get = function (type) {
      var p = parts.filter(function (x) { return x.type === type; })[0];
      return p ? p.value : "";
    };
    var pad2 = function (s) { return (String(s).length < 2) ? "0" + s : s; };
    var offset = "+00:00";
    try {
      var offsetParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        timeZoneName: "longOffset"
      }).formatToParts(date);
      for (var o = 0; o < offsetParts.length; o++) {
        if (offsetParts[o].type === "timeZoneName") {
          var v = offsetParts[o].value;
          var mm = v.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
          if (mm) {
            offset = mm[1] + pad2(mm[2]) + ":" + pad2(mm[3] || "0");
          }
          break;
        }
      }
    } catch (e2) {}
    return get("year") + "-" + get("month") + "-" + get("day") + "T" +
      get("hour") + ":" + get("minute") + ":" + get("second") + offset;
  } catch (e) {
    return "";
  }
}

/*
 *  Copy to clipboard (Clipboard API with execCommand fallback)
 */
function copyToClipboard(id) {
  var el = document.getElementById(id);
  var text = el ? (el.value !== undefined && el.value !== null ? el.value : (el.textContent || "")) : "";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      el.select();
      document.execCommand("copy");
    } else {
      var tmp = document.createElement("textarea");
      tmp.value = text;
      tmp.style.position = "fixed";
      tmp.style.opacity = "0";
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
    }
  }
}


var hasher = {
  ipcalc : new ipCalc(),
  tab : tabs.time,
  timeMsWarningDismissedForValue : null,
  parseTimeInput : function (input) {
    var t = (input || "").trim();
    if (/^\d+$/.test(t)) return new Date(parseInt(t, 10) * 1000);
    return new Date(input);
  },
  elements: {
    h1 : {
      id : tabs.hash+"md5",
      tab : tabs.hash,
      title : "MD5",
      calculate : function (input) {
        return CryptoJS.MD5(input);
      }
    },
    h2 : {
      id: tabs.hash+"sha1",
      tab : tabs.hash,
      title: "SHA-1",
      calculate: function (input) {
        return CryptoJS.SHA1(input);
      }
    },
    h3 : {
      id: tabs.hash+"sha224",
      tab : tabs.hash,
      title: "SHA-224",
      calculate: function (input) {
        return CryptoJS.SHA224(input);
      }
    },
    h4 : {
      id: tabs.hash+"sha256",
      tab : tabs.hash,
      title: "SHA-256",
      calculate: function (input) {
        return CryptoJS.SHA256(input);
      }
    },
    h5 : {
      id: tabs.hash+"sha384",
      tab : tabs.hash,
      title: "SHA-384",
      calculate: function (input) {
        return CryptoJS.SHA384(input);
      }
    },
    h6 : {
      id: tabs.hash+"sha512",
      tab : tabs.hash,
      title: "SHA-512",
      calculate: function (input) {
        return CryptoJS.SHA512(input);
      }
    },
    h8 : {
      id: tabs.hash+"ripemd160",
      tab : tabs.hash,
      title: "RIPEMD-160",
      calculate: function (input) {
        return hex_rmd160(input);
      }
    },
    h7 : {
      id: tabs.hash+"md4",
      tab : tabs.hash,
      title: "MD4",
      calculate: function (input) {
        return hex_md4(input);
      }
    },
    h9 : {
      id: tabs.hash+"whirpool",
      tab : tabs.hash,
      title: "Whirpool",
      calculate: function (input) {
        return Whirlpool(input);
      }
    },

    // HMAC
    hm1 : {
      id : tabs.hmac+"md5",
      tab : tabs.hmac,
      title : "HMAC-MD5",
      calculate : function (input, password) {
        return CryptoJS.HmacMD5(input, password);
      }
    },
    hm2 : {
      id : tabs.hmac+"sha1",
      tab : tabs.hmac,
      title : "HMAC-SHA1",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA1(input, password);
      }
    },
    hm3: {
      id : tabs.hmac+"sha224",
      tab : tabs.hmac,
      title : "HMAC-SHA224",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA224(input, password);
      }
    },
    hm4: {
      id : tabs.hmac+"sha256",
      tab : tabs.hmac,
      title : "HMAC-SHA256",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA256(input, password);
      }
    },
    hm5: {
      id : tabs.hmac+"sha384",
      tab : tabs.hmac,
      title : "HMAC-SHA256",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA384(input, password);
      }
    },
    hm6: {
      id : tabs.hmac+"sha512",
      tab : tabs.hmac,
      title : "HMAC-SHA512",
      calculate : function (input, password) {
        return CryptoJS.HmacSHA512(input, password);
      }
    },
    hm7: {
      id : tabs.hmac+"ripemd160",
      tab : tabs.hmac,
      title : "HMAC-RIPEMD160",
      calculate : function (input, password) {
        return hex_hmac_rmd160(password, input);
      }
    },
    hm8: {
      id : tabs.hmac+"md4",
      tab : tabs.hmac,
      title : "HMAC-MD4",
      calculate : function (input, password) {
        return hex_hmac_md4(password, input);
      }
    },

    // CRC
    c1 : {
      id: tabs.crc+"crc8",
      tab : tabs.crc,
      title: "CRC-8",
      calculate: function (input) {
        return Hex8(Crc8Str(input));
      }
    },
    c2 : {
      id: tabs.crc+"crc16",
      tab : tabs.crc,
      title: "CRC-16",
      calculate: function (input) {
        return Hex16(Crc16Str(input));
      }
    },
    c3 : {
      id: tabs.crc+"fsc16",
      tab : tabs.crc,
      title: "FCS-16",
      calculate: function (input) {
        return Hex16(Fcs16Str(input));
      }
    },
    c4 : {
      id: tabs.crc+"crc32b",
      tab : tabs.crc,
      title: "FCS/CRC-32",
      calculate: function (input) {
        return Hex32(Crc32Str(input));
      }
    },


    // Cipher
    ci1: {
      id : tabs.cipher+"aes256",
      tab : tabs.cipher,
      title : "AES-256",
      calculate : function (input, password) {
        return CryptoJS.AES.encrypt(input, password);
      }
    },
    ci2: {
      id : tabs.cipher+"des",
      tab : tabs.cipher,
      title : "DES",
      calculate : function (input, password) {
        return CryptoJS.DES.encrypt(input, password);
      }
    },
    ci3: {
      id : tabs.cipher+"tripledes",
      tab : tabs.cipher,
      title : "TripleDES",
      calculate : function (input, password) {
        return CryptoJS.TripleDES.encrypt(input, password);
      }
    },
    ci4: {
      id : tabs.cipher+"rabbit",
      tab : tabs.cipher,
      title : "Rabbit",
      calculate : function (input, password) {
        return CryptoJS.Rabbit.encrypt(input, password);
      }
    },
    ci5: {
      id : tabs.cipher+"rc4",
      tab : tabs.cipher,
      title : "RC4",
      calculate : function (input, password) {
        return CryptoJS.RC4.encrypt(input, password);
      }
    },
    ci6: {
      id : tabs.cipher+"rc4drop",
      tab : tabs.cipher,
      title : "RC4Drop",
      calculate : function (input, password) {
        return CryptoJS.RC4Drop.encrypt(input, password);
      }
    },
    ci7: {
      id : tabs.cipher+"aes256-d",
      tab : tabs.cipher,
      title : "AES-256 decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.AES.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci8: {
      id : tabs.cipher+"des-d",
      tab : tabs.cipher,
      title : "DES decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.DES.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci9: {
      id : tabs.cipher+"tripledes-d",
      tab : tabs.cipher,
      title : "TripleDES decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.TripleDES.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci10: {
      id : tabs.cipher+"rabbit-d",
      tab : tabs.cipher,
      title : "Rabbit decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.Rabbit.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci11: {
      id : tabs.cipher+"rc4-d",
      tab : tabs.cipher,
      title : "RC4 decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.RC4.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    ci12: {
      id : tabs.cipher+"rc4drop-d",
      tab : tabs.cipher,
      title : "RC4Drop decrypt",
      calculate : function (input, password) {
        try {
          var words = CryptoJS.RC4Drop.decrypt(input, password);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },

    // Net
    net1 : {
      id: tabs.net+"ip2dec",
      tab : tabs.net,
      title: "IP to Dec",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.getIp();
        } else {
          return "";
        }
      }
    },
    // Net
    net2 : {
      id: tabs.net+"dec2ip",
      tab : tabs.net,
      title: "Dec to IP",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.intToOctetString(ipcalc.getIp());
        } else if (!ipcalc.isIpValid()) {
          return "Invalid IP";
        } else {
          return "";
        }
      }
    },
    net3 : {
      id: tabs.net+"ip2bin",
      tab : tabs.net,
      title: "IP to Bin",
      ruler: 1,
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.getPaddedBinString(ipcalc.getIp());
        } else {
          return "";
        }
      }
    },
    net4 : {
      id: tabs.net+"ip2hex",
      tab : tabs.net,
      title: "IP to Hex",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getIp() != null) {
          return ipcalc.getIp().toString(16);
        } else {
          return "";
        }
      }
    },
    net5 : {
      id: tabs.net+"network",
      tab : tabs.net,
      title: "Network / netmask",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.getNetwork()) + "/" + ipcalc.intToOctetString(ipcalc.getNetmask());
        } else if (!ipcalc.isNetmaskValid()) {
          return "Invalid netmask";
        } else {
          return "";
        }
      }
    },
    net6 : {
      id: tabs.net+"hostmin",
      tab : tabs.net,
      title: "Min host",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.gethHostMin());
        } else {
          return "";
        }
      }
    },
    net7 : {
      id: tabs.net+"hostmax",
      tab : tabs.net,
      title: "Max host",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.gethHostMax());
        } else {
          return "";
        }
      }
    },
    net8 : {
      id: tabs.net+"broadcast",
      tab : tabs.net,
      title: "Broadcast",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.intToOctetString(ipcalc.getBroadcast());
        } else {
          return "";
        }
      }
    },
    net9 : {
      id: tabs.net+"hostnum",
      tab : tabs.net,
      title: "Hosts",
      calculate: function (input) {
        var ipcalc = hasher.ipcalc;
        ipcalc.parse(input);
        if (ipcalc.getNetmask() != null) {
          return ipcalc.gethHostCount();
        } else {
          return "";
        }
      }
    },


    // Time (order defined by timeTabOrder: time5local, time5, time6)
    time5local : {
      id: tabs.time+"date2isoLocal",
      tab : tabs.time,
      title: "ISO 8601 (Local)",
      titleFn: function () {
        return "ISO 8601 (Local – " + getLocalTimezone() + ")";
      },
      calculate: function (input) {
        var date = hasher.parseTimeInput(input);
        if (isNaN(date.getTime())) return "";
        return formatDateISO8601InTZ(date, getLocalTimezone());
      }
    },
    time5 : {
      id: tabs.time+"date2iso",
      tab : tabs.time,
      title: "ISO 8601 (UTC)",
      calculate: function (input) {
        var date = hasher.parseTimeInput(input);
        if (isNaN(date.getTime())) return "";
        return date.toISOString();
      }
    },
    time6 : {
      id: tabs.time+"tz",
      tab : tabs.time,
      title: "IN TIMEZONE",
      tzSelector: true,
      calculate: function (input, password, selectedTz) {
        if (!selectedTz) return "";
        var date = hasher.parseTimeInput(input);
        if (isNaN(date.getTime())) return "";
        return formatDateISO8601InTZ(date, selectedTz);
      }
    },
    timeTsUtc : {
      id: tabs.time+"tsUtc",
      tab : tabs.time,
      title: "Timestamp (UTC)",
      calculate: function (input) {
        var t = (input || "").trim();
        if (/^\d+$/.test(t)) return String(parseInt(t, 10));
        var date = new Date(input);
        if (isNaN(date.getTime())) return "";
        return String(Math.floor(date.getTime() / 1000));
      }
    },


    // Numbers
    n5 : {
      id: tabs.number+"i5",
      tab : tabs.number,
      title: "Dec to Hex",
      ruler: 1,
      calculate: function (input) {
        return numbers.decToHex(input);
      }
    },
    n6 : {
      id: tabs.number+"i6",
      tab : tabs.number,
      title: "Hex to Dec",
      calculate: function (input) {
        return numbers.hexToDec(input);
      }
    },
    n7 : {
      id: tabs.number+"i7",
      tab : tabs.number,
      title: "Dec to Bin",
      ruler: 1,
      calculate: function (input) {
        return numbers.decToBin(input);
      }
    },
    n8 : {
      id: tabs.number+"i8",
      tab : tabs.number,
      title: "Bin to Dec",
      calculate: function (input) {
        return numbers.binToDec(input);
      }
    },
    n9 : {
      id: tabs.number+"i3",
      tab : tabs.number,
      title: "Dec to Roman",
      calculate: function (input) {
        var rc = new RomanConverter();
        return rc.decToRoman(input);
      }
    },
    n10 : {
      id: tabs.number+"i4",
      tab : tabs.number,
      title: "Roman to Dec",
      calculate: function (input) {
        var rc = new RomanConverter();
        return rc.romanToDec(input);
      }
    },


    // Strings
    s1 : {
      id: tabs.string+"i1",
      tab : tabs.string,
      title: "ASCII to Hex",
      ruler: 2,
      calculate: function (input) {
        try {
          var words = CryptoJS.enc.Latin1.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s2 : {
      id: tabs.string+"i2",
      tab : tabs.string,
      title: "Hex to ASCII",
      calculate: function (input) {
        if (/[^0-9a-f]/i.test(input)) {
          return "NaN";
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Latin1.stringify(words);
        } catch (err) {
          return "Parse error";
        }
        return "";
      }
    },
    s3 : {
      id: tabs.string+"utf8-hex",
      tab : tabs.string,
      title: "UTF-8 to Hex",
      ruler: 2,
      calculate: function (input) {
        try {
          var words = CryptoJS.enc.Utf8.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s4 : {
      id: tabs.string+"hex-utf8",
      tab : tabs.string,
      title: "Hex to UTF-8",
      calculate: function (input) {
        if (/[^0-9a-f]/i.test(input)) {
          return "NaN";
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "Parse error";
        }
        return "";
      }
    },
    s5 : {
      id: tabs.string+"utf16-hex",
      tab : tabs.string,
      title: "UTF-16 to Hex",
      ruler: 2,
      calculate: function (input) {
        try {
          var words = CryptoJS.enc.Utf16.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    s6 : {
      id: tabs.string+"hex-utf16",
      tab : tabs.string,
      title: "Hex to UTF-16",
      calculate: function (input) {
        if (/[^0-9a-f]/i.test(input)) {
          return "NaN";
        }
        try {
          var words = CryptoJS.enc.Hex.parse(input);
          return CryptoJS.enc.Utf16.stringify(words);
        } catch (err) {
          return "Parse error";
        }
        return "";
      }
    },


    // Encode
    e1: {
      id : tabs.encode+"base64",
      tab : tabs.encode,
      title : "Base64",
      calculate : function (input) {
        try {
          var words = CryptoJS.enc.Utf8.parse(input);
          return CryptoJS.enc.Base64.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    e2: {
      id : tabs.encode+"base64-d",
      tab : tabs.encode,
      title : "Base64 decode",
      calculate : function (input) {
        try {
          var words = CryptoJS.enc.Base64.parse(input);
          return CryptoJS.enc.Utf8.stringify(words);
        } catch (err) {
          return "";
        }
      }
    },
    e3: {
      id : tabs.encode+"base64-d-h",
      tab : tabs.encode,
      title : "Base64 decode to Hex",
      ruler: 2,
      calculate : function (input) {
        try {
          var words = CryptoJS.enc.Base64.parse(input);
          return CryptoJS.enc.Hex.stringify(words);
        } catch (err) {
          return "Parse error";
        }
      }
    },
    e4: {
      id : tabs.encode+"encodeURI",
      tab : tabs.encode,
      title : "JavaScript encodeURI()",
      calculate : function (input) {
        return encodeURI(input);
      }
    },
    e5: {
      id : tabs.encode+"encodeURIComponent",
      tab : tabs.encode,
      title : "JavaScript encodeURIComponent()",
      calculate : function (input) {
        return encodeURIComponent(input);
      }
    },
    e6: {
      id : tabs.encode+"decodeURI",
      tab : tabs.encode,
      title : "JavaScript decodeURI()",
      calculate : function (input) {
        return decodeURI(input);
      }
    },
    e7: {
      id : tabs.encode+"decodeURIComponent",
      tab : tabs.encode,
      title : "JavaScript decodeURIComponent()",
      calculate : function (input) {
        return decodeURIComponent(input);
      }
    },
    e8: {
      id : tabs.encode+"htmlspecialchars",
      tab : tabs.encode,
      title : "HTML special chars",
      calculate : function (input) {
        function escapeHtml(html) {
          return html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }          

        return escapeHtml(input);
      }
    },
    e9: {
      id : tabs.encode+"htmlspecialchars-d",
      tab : tabs.encode,
      title : "HTML special chars decode",
      calculate : function (input) {
        function unescapeHtml(html) {
          return html
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
        }          

        return unescapeHtml(input);
      }
    },
    e10: {
      id : tabs.encode+"rot13",
      tab : tabs.encode,
      title : "ROT13 encode/decode",
      calculate : function (input) {
        var renc = new Rot13();
        return renc.encode(input);
      }
    }
  },
  getElementById : function (id) {
    for (i in this.elements) {
      if (this.elements[i].id == id) {
        return this.elements[i];
      }
    }
    return null;
  },
  /*
   */
  init : function () {
    // render HTML
    this.render();
    // Register click events
    for (var i in this.elements) {
      if (this.elements[i].tab == this.tab) {
        // expand textarea
        $("#"+this.elements[i].id+"-expand").click(function () {
          var id = this.id.toString().replace("-expand", "");
          if (!$("#"+this.id).hasClass("on")) {
            var element = hasher.getElementById(id);
            if (element) {
              $("#"+id).attr("rows", element.rows);
            }
            //var h = $("#"+id)[0].scrollHeight;
            //$("#"+id).height(h);
          } else {
            $("#"+id).attr("rows", "1");
            //$("#"+id).height("auto");
          }
          $("#"+this.id).toggleClass("on");
        });
        // copy to clipboard on click
        $("#"+this.elements[i].id+"-value").click(function () {
          $("#output .note").hide();
          var id = this.id.toString().replace("-value", "");
          var node = document.getElementById(id);
          var text = node ? (node.value !== undefined && node.value !== null ? node.value : (node.textContent || "")) : "";
          if (text.length > 0) {
            $("#"+id+"-note").text("copied").show('fast');
            copyToClipboard(id);
          }
        });
      }
    }
  },
  /*
   * Recalculate
   */
  update : function () {
    $("#output .note").hide();
    var input = $("#input-value").val();
    var password = $("#input-password").val();
    var keys = (this.tab == tabs.time) ? timeTabOrder : Object.keys(this.elements);
    for (var k = 0; k < keys.length; k++) {
      var i = keys[k];
      var elem = this.elements[i];
      if (!elem || elem.tab != this.tab) continue;
      elem.rows = 0;
      var el = elem;
      var value;
      if (el.tzSelector) {
        var selectedTz = $("#time-tz-select").val();
        value = el.calculate(input, password, selectedTz);
        var node = document.getElementById(el.id);
        if (node) node.textContent = value;
        else $("#"+el.id).text(value);
      } else {
        value = el.calculate(input, password);
        var node = document.getElementById(el.id);
        if (node) node.value = value;
        else $("#"+el.id).val(value);
      }

      if (!el.tzSelector) {
        var res = value.toString().match(/(\n\r|\r\n|\n|\r)/g);
        var rows = 1;
        if (res != null && res.length != undefined) {
          rows = res.length + 1;
        }
        elem.rows = rows;
        if (rows > 1) {
          $("#"+el.id+"-expand").show().text(rows + " lines").show();
        } else {
          $("#"+el.id+"-expand").text("").hide();
        }
        if (el.ruler != undefined) {
          $("#"+el.id+"-ruler").html(this.ruler(value, el.ruler));
        }
      }
    }
    if (this.tab == tabs.time) {
      var trimmed = (input || "").trim();
      var looksLikeMs = timeInputLooksLikeMs(trimmed);
      var warn = document.getElementById("time-ms-warning");
      if (warn) {
        var dismissedForThisValue = hasher.timeMsWarningDismissedForValue !== null && trimmed === hasher.timeMsWarningDismissedForValue;
        if (looksLikeMs && !dismissedForThisValue) {
          var n = parseInt(trimmed, 10);
          var trimmedValue = String(Math.floor(n / 1000));
          var useBtn = warn.querySelector(".time-ms-warning-use-trimmed");
          if (useBtn) {
            useBtn.textContent = "use " + trimmedValue;
            useBtn.setAttribute("data-trimmed-value", trimmedValue);
          }
          warn.style.display = "";
        } else {
          warn.style.display = "none";
        }
      }
    }
  },
  /*
   * 
   */
  render : function () {
    $("#output").html("");
    if (this.tab == tabs.time) {
      $("#output").append(
        '<div id="time-ms-warning" class="time-ms-warning" style="display:none">' +
          '<span class="time-ms-warning-text">This value looks like a timestamp in milliseconds. To see a timestamp in seconds, remove the last 3 digits.</span> ' +
          '<button type="button" class="time-ms-warning-use-trimmed"></button> ' +
          '<button type="button" class="time-ms-warning-dismiss">Dismiss</button>' +
        '</div>'
      );
    }
    var keys = (this.tab == tabs.time) ? timeTabOrder : Object.keys(this.elements);
    for (var k = 0; k < keys.length; k++) {
      var i = keys[k];
      var el = this.elements[i];
      if (!el || el.tab != this.tab) continue;
      var title = el.titleFn ? el.titleFn() : el.title;
      var html;
        if (el.tzSelector) {
        html =
          '<div class="element element-tz">'+
            '<div>'+
              '<span id="'+el.id+'-title" class="title">'+title+'</span>'+
              '<span id="'+el.id+'-note" class="note"></span>'+
            '</div>'+
            '<div class="tz-autocomplete">'+
              '<input type="text" class="tz-input" placeholder="Search timezones…" autocomplete="off" />'+
              '<input type="hidden" id="time-tz-select" />'+
              '<div class="tz-dropdown"></div>'+
            '</div>'+
            '<div id="'+el.id+'-value" class="value">'+
              '<div id="'+el.id+'" class="value-display" data-copy-target="true"></div>'+
            '</div>'+
          '</div>';
      } else {
        html =
          '<div class="element">'+
            '<div>'+
              '<span id="'+el.id+'-title" class="title">'+title+'</span>'+
              '<span id="'+el.id+'-expand" class="expand"></span>'+
              '<span id="'+el.id+'-note" class="note"></span>'+
            '</div>'+
            '<div id="'+el.id+'-value" class="value">'+
              '<textarea id="'+el.id+'" rows="1"></textarea>';
        if (el.ruler != undefined) {
          html += '<div id="'+el.id+'-ruler" class="ruler"></div>';
        }
        html += '</div></div>';
      }
      $("#output").append(html);
    }
    if (this.tab == tabs.time) {
      var dropdown = document.querySelector(".tz-dropdown");
      var input = document.querySelector(".tz-input");
      var hidden = document.getElementById("time-tz-select");
      if (dropdown && dropdown.children.length === 0) {
        var tzList = getTimeZonesForSelect();
        var defaultTz = "America/New_York";
        var defaultLabel = "";
        for (var t = 0; t < tzList.length; t++) {
          var item = document.createElement("div");
          item.className = "tz-option";
          item.setAttribute("data-value", tzList[t].value);
          item.textContent = tzList[t].label;
          dropdown.appendChild(item);
          if (tzList[t].value === defaultTz) defaultLabel = tzList[t].label;
        }
        if (hidden) {
          hidden.value = defaultTz;
          if (input) input.value = defaultLabel;
        }
        var closeTimer;
        var highlightedIndex = 0;

        function getVisibleOptions() {
          var opts = dropdown.querySelectorAll(".tz-option");
          var vis = [];
          for (var o = 0; o < opts.length; o++) {
            if (opts[o].style.display !== "none") vis.push(opts[o]);
          }
          return vis;
        }

        function setHighlight(index) {
          var vis = getVisibleOptions();
          if (vis.length === 0) return;
          highlightedIndex = Math.max(0, Math.min(index, vis.length - 1));
          for (var i = 0; i < vis.length; i++) {
            vis[i].classList.toggle("highlighted", i === highlightedIndex);
          }
          var el = vis[highlightedIndex];
          if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }

        function selectHighlighted() {
          var vis = getVisibleOptions();
          if (vis.length === 0) return;
          var el = vis[highlightedIndex];
          if (!el) return;
          var val = el.getAttribute("data-value");
          var label = el.textContent;
          if (hidden) hidden.value = val;
          if (input) input.value = label;
          dropdown.classList.remove("open");
          hasher.update();
        }

        function filterAndShow() {
          var q = (input.value || "").toLowerCase();
          var opts = dropdown.querySelectorAll(".tz-option");
          for (var o = 0; o < opts.length; o++) {
            var show = opts[o].textContent.toLowerCase().indexOf(q) >= 0;
            opts[o].style.display = show ? "" : "none";
          }
          dropdown.classList.add("open");
          setHighlight(0);
        }
        function close() {
          closeTimer = setTimeout(function () {
            dropdown.classList.remove("open");
          }, 150);
        }
        $(input).off("focus input").on("focus input", function () {
          clearTimeout(closeTimer);
          filterAndShow();
        });
        $(input).off("blur").on("blur", close);
        $(input).off("keydown").on("keydown", function (e) {
          if (!dropdown.classList.contains("open")) return;
          var vis = getVisibleOptions();
          if (e.which === 40) {
            e.preventDefault();
            setHighlight(highlightedIndex + 1);
            return;
          }
          if (e.which === 38) {
            e.preventDefault();
            setHighlight(highlightedIndex - 1);
            return;
          }
          if (e.which === 13) {
            e.preventDefault();
            selectHighlighted();
            return;
          }
          if (e.which === 27) {
            e.preventDefault();
            dropdown.classList.remove("open");
          }
        });
        $(dropdown).off("mousedown").on("mousedown", function (e) {
          e.preventDefault();
        });
        $(dropdown).off("click").on("click", ".tz-option", function () {
          var val = this.getAttribute("data-value");
          var label = this.textContent;
          if (hidden) hidden.value = val;
          if (input) input.value = label;
          dropdown.classList.remove("open");
          hasher.update();
        });
        $(dropdown).off("mouseenter").on("mouseenter", ".tz-option", function () {
          var vis = getVisibleOptions();
          for (var i = 0; i < vis.length; i++) {
            if (vis[i] === this) {
              setHighlight(i);
              break;
            }
          }
        });
      }
    }
  },
  /*
   * Symbol's numbers
   */
  ruler : function (value, type) {
    var html = "";
    var length = value.length;
    if (type == -1) {
      for (var i = 0; i < value.length; i++) {
        html += '<span title="'+(length - i - 1)+'">&nbsp;</span>';
      }
    } else if (type == 2) {
      for (i = 0; i < value.length; i+= 2) {
        html += '<span title="'+(i/2 + 1)+'">&nbsp;&nbsp;</span>';
      }
    } else {
      for (i = 0; i < value.length; i++) {
        html += '<span title="'+(i+1)+'">&nbsp;</span>';
      }
    }
    return html;
  }
}
