document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const fgColourText = document.getElementById('foreground-colour-text');
    const fgColourPicker = document.getElementById('foreground-colour-picker');
    const fgPreview = document.getElementById('foreground-preview');
    const fgAlphaInput = document.getElementById('foreground-alpha');
    const fgLightnessInput = document.getElementById('foreground-lightness');
    const fgLightnessValueDisplay = document.getElementById('foreground-lightness-value');

    const bgColourText = document.getElementById('background-colour-text');
    const bgColourPicker = document.getElementById('background-colour-picker');
    const bgPreview = document.getElementById('background-preview');
    const bgAlphaInput = document.getElementById('background-alpha');
    const bgLightnessInput = document.getElementById('background-lightness');
    const bgLightnessValueDisplay = document.getElementById('background-lightness-value');

    const contrastRatioDisplay = document.getElementById('contrast-ratio');
    const sampleText = document.getElementById('sample-text');
    const alphaWarningMessage = document.getElementById('alpha-warning-message');

    const wcagNormalAA = document.getElementById('wcag-normal-aa');
    const wcagLargeAA = document.getElementById('wcag-large-aa');
    const wcagNormalAAA = document.getElementById('wcag-normal-aaa');
    const wcagLargeAAA = document.getElementById('wcag-large-aaa');

    // --- Constants ---
    const MIN_CONTRAST_AA_NORMAL = 4.5;
    const MIN_CONTRAST_AA_LARGE = 3;
    const MIN_CONTRAST_AAA_NORMAL = 7;
    const MIN_CONTRAST_AAA_LARGE = 4.5;
    const PAGE_BASE_BG_RGB = { r: 255, g: 255, b: 255 }; // Assuming white page background for blending

    // --- State Variables ---
    // To prevent feedback loops between text hex input and lightness slider
    let isUpdatingFromLightnessSliderFg = false;
    let isUpdatingFromLightnessSliderBg = false;

    // --- Colour Conversion & Manipulation ---
    function isValidHex(hex) {
        return /^[0-9A-F]{3}$|^[0-9A-F]{6}$/i.test(hex);
    }

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (hex.length !== 6) return null;
        const bigint = parseInt(hex, 16);
        return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    }

    function rgbToHex(r, g, b) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToRgb(h, s, l) {
        s /= 100; l /= 100; h /= 360;
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    // Blend colour (with alpha) onto a base colour (opaque)
    function blendColours(rgbaColour, baseRgb) {
        const alpha = rgbaColour.a;
        if (alpha >= 1) return { r: rgbaColour.r, g: rgbaColour.g, b: rgbaColour.b }; // Fully opaque
        if (alpha <= 0) return baseRgb; // Fully transparent

        return {
            r: Math.round(rgbaColour.r * alpha + baseRgb.r * (1 - alpha)),
            g: Math.round(rgbaColour.g * alpha + baseRgb.g * (1 - alpha)),
            b: Math.round(rgbaColour.b * alpha + baseRgb.b * (1 - alpha)),
        };
    }

    // WCAG Luminance and Contrast (same as before)
    function getLuminance(r, g, b) {
        const a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function calculateContrastRatio(lum1, lum2) {
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    // --- UI Update Functions ---
    function updateStatus(element, passes, threshold) {
        if (passes) {
            element.textContent = `Pass (Requires ${threshold.toFixed(1)}:1)`;
            element.className = 'status pass';
        } else {
            element.textContent = `Fail (Requires ${threshold.toFixed(1)}:1)`;
            element.className = 'status fail';
        }
    }

    function updateLightnessSliderGradient(sliderElement, r, g, b) {
        const currentHsl = rgbToHsl(r, g, b);
        // Gradient from black (L=0) to white (L=100) through current color's H and S
        const colorAt0 = hslToRgb(currentHsl.h, currentHsl.s, 0);
        const colorAt50 = hslToRgb(currentHsl.h, currentHsl.s, 50); // The pure color at 50% lightness
        const colorAt100 = hslToRgb(currentHsl.h, currentHsl.s, 100);

        sliderElement.style.background = `linear-gradient(to right, 
            rgb(${colorAt0.r},${colorAt0.g},${colorAt0.b}), 
            rgb(${colorAt50.r},${colorAt50.g},${colorAt50.b}), 
            rgb(${colorAt100.r},${colorAt100.g},${colorAt100.b}))`;
    }


    function updateContrast() {
        let fgHexRaw = fgColourText.value;
        let bgHexRaw = bgColourText.value;

        if (!isValidHex(fgHexRaw)) fgHexRaw = "FFFFFF";
        if (!isValidHex(bgHexRaw)) bgHexRaw = "000000";

        fgColourText.value = fgHexRaw.toUpperCase(); // Normalize
        bgColourText.value = bgHexRaw.toUpperCase(); // Normalize

        const fgPickerValue = "#" + fgHexRaw;
        if (fgColourPicker.value !== fgPickerValue) fgColourPicker.value = fgPickerValue;
        
        const bgPickerValue = "#" + bgHexRaw;
        if (bgColourPicker.value !== bgPickerValue) bgColourPicker.value = bgPickerValue;

        const fgRgbBase = hexToRgb(fgHexRaw);
        const bgRgbBase = hexToRgb(bgHexRaw);

        if (!fgRgbBase || !bgRgbBase) { /* Should not happen with validation */
            contrastRatioDisplay.textContent = 'Invalid Colour';
            return;
        }

        const fgAlpha = parseFloat(fgAlphaInput.value);
        const bgAlpha = parseFloat(bgAlphaInput.value);

        // --- Alpha Blending Logic ---
        // 1. Effective Background: Blend the input background colour with the page's base background (white) if bgAlpha < 1
        const effectiveBgRgb = blendColours(
            { ...bgRgbBase, a: bgAlpha },
            PAGE_BASE_BG_RGB
        );

        // 2. Effective Foreground: Blend the input foreground colour with the effective background colour if fgAlpha < 1
        const effectiveFgRgb = blendColours(
            { ...fgRgbBase, a: fgAlpha },
            effectiveBgRgb
        );
        
        // Update Previews with effective (blended) colours as they would appear
        fgPreview.style.backgroundColor = `rgba(${fgRgbBase.r}, ${fgRgbBase.g}, ${fgRgbBase.b}, ${fgAlpha})`;
        bgPreview.style.backgroundColor = `rgba(${bgRgbBase.r}, ${bgRgbBase.g}, ${bgRgbBase.b}, ${bgAlpha})`;
        
        // Sample text uses effective colours for visual representation
        sampleText.style.color = `rgb(${effectiveFgRgb.r}, ${effectiveFgRgb.g}, ${effectiveFgRgb.b})`;
        sampleText.style.backgroundColor = `rgb(${effectiveBgRgb.r}, ${effectiveBgRgb.g}, ${effectiveBgRgb.b})`;

        // Show alpha warning if either alpha is less than 1
        if (fgAlpha < 1 || bgAlpha < 1) {
            alphaWarningMessage.style.display = 'block';
            let message = [];
            if (fgAlpha < 1) message.push("Foreground alpha");
            if (bgAlpha < 1) message.push("Background alpha");
            alphaWarningMessage.textContent = `${message.join(' and ')} less than 1. Colours are blended against a white page background where applicable for contrast calculation.`;
        } else {
            alphaWarningMessage.style.display = 'none';
        }


        // --- Contrast Calculation using effective colours ---
        const fgLuminance = getLuminance(effectiveFgRgb.r, effectiveFgRgb.g, effectiveFgRgb.b);
        const bgLuminance = getLuminance(effectiveBgRgb.r, effectiveBgRgb.g, effectiveBgRgb.b);
        const contrastRatio = calculateContrastRatio(fgLuminance, bgLuminance);
        contrastRatioDisplay.textContent = `${contrastRatio.toFixed(2)}:1`;

        // --- WCAG Compliance ---
        updateStatus(wcagNormalAA, contrastRatio >= MIN_CONTRAST_AA_NORMAL, MIN_CONTRAST_AA_NORMAL);
        updateStatus(wcagLargeAA, contrastRatio >= MIN_CONTRAST_AA_LARGE, MIN_CONTRAST_AA_LARGE);
        updateStatus(wcagNormalAAA, contrastRatio >= MIN_CONTRAST_AAA_NORMAL, MIN_CONTRAST_AAA_NORMAL);
        updateStatus(wcagLargeAAA, contrastRatio >= MIN_CONTRAST_AAA_LARGE, MIN_CONTRAST_AAA_LARGE);

        // Update lightness sliders and their gradients if not currently being dragged
        if (!isUpdatingFromLightnessSliderFg) {
            const fgHsl = rgbToHsl(fgRgbBase.r, fgRgbBase.g, fgRgbBase.b);
            fgLightnessInput.value = fgHsl.l;
            fgLightnessValueDisplay.textContent = `${Math.round(fgHsl.l)}%`;
            updateLightnessSliderGradient(fgLightnessInput, fgRgbBase.r, fgRgbBase.g, fgRgbBase.b);
        }
        if (!isUpdatingFromLightnessSliderBg) {
            const bgHsl = rgbToHsl(bgRgbBase.r, bgRgbBase.g, bgRgbBase.b);
            bgLightnessInput.value = bgHsl.l;
            bgLightnessValueDisplay.textContent = `${Math.round(bgHsl.l)}%`;
            updateLightnessSliderGradient(bgLightnessInput, bgRgbBase.r, bgRgbBase.g, bgRgbBase.b);
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Foreground
        fgColourText.addEventListener('input', () => {
            if (isValidHex(fgColourText.value)) updateContrast();
        });
        fgColourPicker.addEventListener('input', () => {
            fgColourText.value = fgColourPicker.value.substring(1).toUpperCase();
            updateContrast();
        });
        fgAlphaInput.addEventListener('input', updateContrast);
        fgLightnessInput.addEventListener('input', () => {
            isUpdatingFromLightnessSliderFg = true;
            const currentHex = fgColourText.value;
            const currentRgb = hexToRgb(currentHex);
            if (currentRgb) {
                let currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
                currentHsl.l = parseFloat(fgLightnessInput.value);
                fgLightnessValueDisplay.textContent = `${Math.round(currentHsl.l)}%`;
                const newRgb = hslToRgb(currentHsl.h, currentHsl.s, currentHsl.l);
                fgColourText.value = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
                updateLightnessSliderGradient(fgLightnessInput, newRgb.r, newRgb.g, newRgb.b); // Update gradient as slider moves
                updateContrast();
            }
        });
        fgLightnessInput.addEventListener('mouseup', () => { isUpdatingFromLightnessSliderFg = false; }); // also 'touchend' for mobile
        fgLightnessInput.addEventListener('touchend', () => { isUpdatingFromLightnessSliderFg = false; });


        // Background
        bgColourText.addEventListener('input', () => {
            if (isValidHex(bgColourText.value)) updateContrast();
        });
        bgColourPicker.addEventListener('input', () => {
            bgColourText.value = bgColourPicker.value.substring(1).toUpperCase();
            updateContrast();
        });
        bgAlphaInput.addEventListener('input', updateContrast);
        bgLightnessInput.addEventListener('input', () => {
            isUpdatingFromLightnessSliderBg = true;
            const currentHex = bgColourText.value;
            const currentRgb = hexToRgb(currentHex);
            if (currentRgb) {
                let currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
                currentHsl.l = parseFloat(bgLightnessInput.value);
                bgLightnessValueDisplay.textContent = `${Math.round(currentHsl.l)}%`;
                const newRgb = hslToRgb(currentHsl.h, currentHsl.s, currentHsl.l);
                bgColourText.value = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
                updateLightnessSliderGradient(bgLightnessInput, newRgb.r, newRgb.g, newRgb.b);
                updateContrast();
            }
        });
        bgLightnessInput.addEventListener('mouseup', () => { isUpdatingFromLightnessSliderBg = false; });
        bgLightnessInput.addEventListener('touchend', () => { isUpdatingFromLightnessSliderBg = false; });

        // Validate on blur for text inputs in case of partial entry
        fgColourText.addEventListener('blur', () => { if (!isValidHex(fgColourText.value)) fgColourText.value = "FFFFFF"; updateContrast(); });
        bgColourText.addEventListener('blur', () => { if (!isValidHex(bgColourText.value)) bgColourText.value = "000000"; updateContrast(); });
    }

    // --- Initialisation ---
    setupEventListeners();
    updateContrast(); // Initial calculation
});