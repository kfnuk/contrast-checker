# Contrast Checker

A web-based tool to calculate the contrast ratio between foreground and background colours, ensuring your designs meet Web Content Accessibility Guidelines (WCAG). This tool is designed with a clean, light interface inspired by Apple's Human Interface Guidelines.

## Features

* **Foreground & Background Colour Input:**
    * Enter colours using Hexadecimal codes (e.g., `RRGGBB`).
    * Use native browser colour pickers for easy selection.
* **Alpha (Transparency) Control:**
    * Adjust the alpha value (0.00 to 1.00) for both foreground and background colours.
    * Colours with alpha are blended appropriately for accurate contrast calculation based on their visual appearance (foreground over background, background over a default white page).
* **Lightness Slider:**
    * Fine-tune the lightness (HSL 'L' value) of both foreground and background colours using an intuitive slider.
    * The slider's gradient dynamically updates to reflect the current colour's hue and saturation.
* **Real-time Contrast Ratio Display:**
    * See the contrast ratio calculated instantly as you modify colours, alpha, or lightness.
* **WCAG Compliance Indicators:**
    * Clear "Pass" or "Fail" status for:
        * **AA Normal Text** (Requires 4.5:1)
        * **AA Large Text** (Requires 3:1)
        * **AAA Normal Text** (Requires 7:1)
        * **AAA Large Text** (Requires 4.5:1)
* **Live Sample Text Preview:**
    * Visually assess the readability of sample text with the selected foreground and background colours.
* **Responsive Design:**
    * Usable across different screen sizes, with a two-column layout for wider displays.
* **Light Theme UI:**
    * Clean and modern interface inspired by Apple's Human Interface Guidelines, focusing on clarity and ease of use.

## Tech Stack

* **HTML5:** For the structure and content of the application.
* **CSS3:** For styling, layout (including Flexbox and Grid), and the Apple-inspired aesthetic.
* **JavaScript (ES6+):** For all the functional logic, including:
    * Colour parsing and validation.
    * Colour conversions (Hex ↔ RGB, RGB ↔ HSL).
    * Alpha blending calculations.
    * WCAG luminance and contrast ratio calculations.
    * Dynamic DOM manipulation and UI updates.

## How to Use

1.  **Clone the repository or download the files:**
    * `index.html`
    * `style.css`
    * `script.js`
2.  **Open `index.html` in your web browser.**
    * No build process or dependencies are required.
3.  **Input Colours:**
    * Enter a 6-digit hexadecimal colour code (e.g., `1D1D1F`) into the "Hex Value" field for the foreground and background. The `#` is automatically handled.
    * Alternatively, click the colour swatch next to the hex input to use your browser's native colour picker.
4.  **Adjust Alpha & Lightness (Optional):**
    * Use the "Alpha" input (0-1) to set transparency.
    * Use the "Lightness" slider (0-100%) to modify the selected colour's lightness. The hex value will update accordingly.
5.  **View Results:**
    * The contrast ratio and WCAG compliance levels will update automatically.
    * Observe the sample text to see a live preview.

## Design & Implementation Notes

* **Colour Model:** The tool internally converts colours between Hex, RGB, and HSL (for the lightness slider) as needed.
* **Alpha Blending:**
    * If the background colour has an alpha value less than 1, it is first blended against a default opaque white background (`#FFFFFF`) to determine its effective visual colour.
    * The foreground colour (if it has an alpha value less than 1) is then blended against this (potentially already blended) effective background colour.
    * The final contrast is calculated between these two *effective visual colours*.
* **WCAG Formulae:** The luminance and contrast ratio calculations adhere to the standards defined in the Web Content Accessibility Guidelines.
