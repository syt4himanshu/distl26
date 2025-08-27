# Student Dashboard and Form

This directory contains the professional student dashboard and the enhanced student mentoring form.

## Files Overview

### Dashboard Files
- **`dashboard.html`** - Main dashboard interface with navbar, sections, and responsive design
- **`dashboard.css`** - Modern styling with CSS variables, dark mode support, and responsive design
- **`dashboard.js`** - Dashboard functionality including navbar, mobile menu, and data loading

### Form Files
- **`s.html`** - Enhanced student mentoring form with modern styling
- **`s.css`** - Improved form styling with CSS variables and dark mode support
- **`s.js`** - Form logic and validation (existing functionality preserved)

## Features

### Dashboard Features
- **Responsive Navbar**: Dynamic greeting with student name, logout, change password, and dark mode toggle
- **Mobile-First Design**: Hamburger menu for mobile devices with smooth animations
- **Dark Mode**: Toggle between light and dark themes with persistent storage
- **Three Main Sections**:
  1. **Update Profile**: Quick access to the student form
  2. **Mentoring Remarks**: Display of faculty feedback and suggestions
  3. **Mentor Information**: Faculty mentor details and contact information

### Form Enhancements
- **Modern UI**: Clean, professional design with improved spacing and typography
- **Dark Mode Support**: Consistent theming across dashboard and form
- **Enhanced Styling**: Better visual hierarchy, hover effects, and modern aesthetics
- **Preserved Functionality**: All existing form logic, validation, and classes maintained

## Usage

### Accessing the Dashboard
1. Navigate to `dashboard.html` after logging in as a student
2. The dashboard will automatically load student data and mentor information
3. Use the navbar to navigate between sections or access account functions

### Using the Form
1. Click "Update Profile" from the dashboard or navigate directly to `s.html`
2. The form maintains all existing functionality with improved visual design
3. Use the theme toggle in the header to switch between light and dark modes

### Responsive Design
- **Desktop**: Full layout with side-by-side sections
- **Tablet**: Adaptive grid layout
- **Mobile**: Stacked layout with mobile-optimized navigation

## Technical Details

### CSS Variables
The design system uses CSS custom properties for consistent theming:
- Color schemes for light and dark modes
- Spacing, shadows, and border radius values
- Smooth transitions and animations

### Dark Mode Implementation
- Theme preference stored in localStorage
- Automatic theme switching with smooth transitions
- Consistent color schemes across all components

### Browser Support
- Modern browsers with CSS Grid and Flexbox support
- Progressive enhancement for older browsers
- Mobile-first responsive design

## Customization

### Colors
Modify the CSS variables in `:root` to change the color scheme:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    /* ... other variables */
}
```

### Dark Mode Colors
Adjust dark theme colors in the `[data-theme="dark"]` selector:
```css
[data-theme="dark"] {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    /* ... other dark theme variables */
}
```

## Dependencies

- **Authentication**: Requires `../js/auth.js` for route protection
- **Backend API**: Expects API endpoints for student and mentor data
- **Modern CSS**: Uses CSS Grid, Flexbox, and CSS Variables

## Notes

- All existing form functionality and validation logic has been preserved
- The design follows modern UI/UX principles with accessibility considerations
- The dashboard is designed to be easily extensible for additional features
- Theme preferences are synchronized between dashboard and form
