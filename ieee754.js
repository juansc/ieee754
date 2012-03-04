/*
 * A script that operates a form in which a user can type in a hexadecimal value for an
 * IEEE-754 single-precision value and have it shown in binary (with sign, exponent, and
 * mantissa highlighted) and decimal.
 */
$(function () {

    // It's little endian if integer 1 is encoded as 01.00.00.00
    var littleEndian = !!(new Uint8Array((new Uint32Array([1])).buffer))[0];
    
    var allZeros = /^0+$/;
    var allOnes = /^1+$/;

    var translate = [
        "0000", "0001", "0010", "0011", "0100", "0101", "0110", "0111",
        "1000", "1001", "1010", "1011", "1100", "1101", "1110", "1111"
    ];

    /*
     * Return a string of the form "(1.f)_2 x 2^e" where the fractional part has no trailing
     * zeros.
     */
    var formatExactValue = function (fraction, exponent) {
        return "(1." + (fraction.replace(/0+$/, "") || "0") + ")<sub>2</sub>"
            + " &times; 2<sup>" + exponent + "</sup>";
    }

    /*
     * Determine the various interpretations of the given hex value and render them into the
     * document.
     */
    var decodeAndUpdate = function (h) {

        // Render in binary.  Hackish.
        var b = "";
        for (var i = 0, n = h.length; i < n; i++) {
            b += translate["0123456789ABCDEF".indexOf(h.charAt(i))];
        }

        // Determine configuration.  This could have all been precomputed but it is fast enough.
        var exponentBits = h.length === 8 ? 8 : 11;
        var mantissaBits = (h.length * 4) - exponentBits - 1;
        var bias = Math.pow(2, exponentBits - 1) - 1;
        var minExponent = 1 - bias - mantissaBits;

        // Break up the binary representation into its pieces for easier processing.
        var s = b[0];
        var e = b.substring(1, exponentBits + 1);
        var m = b.substring(exponentBits + 1);

        var value = 0;
        var text = (s === "0" ? "+" : "-");
        var multiplier = (s === "0" ? 1 : -1);

        if (allZeros.test(e)) {
            // Zero or denormalized
            if (allZeros.test(m)) {
                text += " Zero";
            } else {
                var firstOneIndex = m.indexOf("1");
                text += formatExactValue(m.substring(firstOneIndex + 1), -bias-firstOneIndex);
                value = parseInt(m, 2) * Math.pow(2, minExponent);
            }

        } else if (allOnes.test(e)) {
            // Infinity or NaN
            if (allZeros.test(m)) {
                text += "&#x221E;";
                value = Infinity;
            } else {
                text = "NaN";
                value = NaN;
            }

        } else {
            // Normalized
            var exponent = parseInt(e, 2) - bias;
            var mantissa = parseInt(m, 2);
            text += formatExactValue(m, exponent);
            value = (1 + (mantissa * Math.pow(2, -mantissaBits))) * Math.pow(2, exponent);
        }

        // All done computing, render everything.
        $("#sign").html(s);
        $("#exp").html(e);
        $("#mantissa").html(m);
        $("#description").html(text);
        $("#decimal").html(value * multiplier);
    }

    var byteArrayToHex = function (b) {
        var array = [];
        for (var i = 0; i < b.length; i++) {
            array[littleEndian ? "unshift" : "push"](b[i]);
        }
        return array.map(function (byte) {
            var hex = byte.toString(16);
            return hex.length === 1 ? "0" + hex : "" + hex;
        }).join("");
    }
    
    /**
     * Here's the code for encoding decimal values into hex.  Here we let JavaScript do all
     * the work.
     */
    var encodeAndUpdate = function (d) {
        $("#32hex").html(byteArrayToHex(new Uint8Array((new Float32Array([d])).buffer)));
        $("#64hex").html(byteArrayToHex(new Uint8Array((new Float64Array([d])).buffer)));
        $("#eprinted").html(+d);
    }
    
    // Prohibit non-hex digits from even being entered into the textfield.
    $("#hex").keypress(function (e) {
        var char = String.fromCharCode(e.which);
        if (! /[\dA-Fa-f]/.test(char)) {
            e.preventDefault();
        }
    });

    // Update the display after something has been entered in the decoding section.
    $("#hex").keyup(function (e) {
        var h = $("#hex").val().toUpperCase();
        if (h.length === 8 || h.length === 16) {
            decodeAndUpdate(h);
        } else {
            // Erase all the computed fields from the page
            $("#decoder span").html("");
        }
    });
    
    // Update the display after something has been entered in the encoding section.
    $("#edec").keyup(function (e) {
        var d = $("#edec").val();
        if (/^\d+(\.\d*([Ee][+-]?\d+)?)?$/.test(d)) {
            encodeAndUpdate(d);
        } else {
            // Erase all the computed fields from the page
            $("#encoder span").html("");
        }
    });
    
});
