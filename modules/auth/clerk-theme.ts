// QwantomHub Design System theme configuration for Clerk components
export const qwantomhubClerkTheme = {
  layout: {
    socialButtonsVariant: 'auto' as const,
    logoPlacement: 'inside' as const,
  },
  variables: {
    colorPrimary: '#46335c', // ink token
    colorBackground: '#bfb5cf', // surface token
    colorText: '#46335c', // ink token
    colorTextSecondary: '#5b4e6d', // muted token
    colorInputBackground: '#d4d1e1', // bg token
    colorInputText: '#2a2136', // ink-deep token
    borderRadius: '0.5rem',
    fontFamily: '"Poppins", sans-serif',
  },
  elements: {
    card: {
      backgroundColor: '#bfb5cf',
      borderColor: '#9280ab',
      boxShadow: '0 10px 25px -5px rgba(70, 51, 92, 0.1)',
    },
    formButtonPrimary: {
      backgroundColor: '#46335c',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#6a5882',
      },
    },
  },
};
