# Theme Guidelines

This document outlines the theme system and styling conventions used throughout the AquaConnect application.

## Color Palette

### Primary Colors
- Primary 500: `#0ea5e9` (Sky Blue)
- Accent 500: `#d946ef` (Fuchsia)

### Semantic Colors
- Success: `#10b981` (Emerald)
- Warning: `#f59e0b` (Amber)
- Error: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

## Typography

The application uses the Poppins font family for all text elements.

## Component Classes

### Glass Effects
- `.glass-effect`: Base glass effect with backdrop blur
- `.glass-card`: Glass card with rounded corners and shadow

### Buttons
- `.btn-primary`: Primary action button with gradient
- `.btn-secondary`: Secondary action button
- `.btn-success`: Success action button
- `.btn-warning`: Warning action button
- `.btn-error`: Error action button

### Inputs
- `.input-field`: Standard input field with glass effect

### Text
- `.text-gradient`: Text with primary to accent gradient
- `.text-gradient-reverse`: Text with accent to primary gradient

## Responsive Design

The application uses Tailwind's responsive breakpoints:
- Mobile: Default styles
- Tablet: `md:` prefix
- Desktop: `lg:` prefix
- Large Desktop: `xl:` prefix

## Dark Mode

Dark mode is implemented using the `dark` class on the root element. All components should have both light and dark variants.

## Animation Classes

- `.animate-fadeIn`: Fade in animation
- `.animate-blob`: Floating blob animation
- `.animation-delay-2000`: 2 second animation delay
- `.animation-delay-4000`: 4 second animation delay

## Usage Examples

### Card Component
```html
<div class="glass-card p-6">
  <h2 class="text-gradient">Card Title</h2>
  <p>Card content</p>
</div>
```

### Primary Button
```html
<button class="btn-primary py-2 px-4">
  Click Me
</button>
```

### Input Field
```html
<input class="input-field py-2 px-4" placeholder="Enter text" />
```