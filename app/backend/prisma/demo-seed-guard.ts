export const assertDemoSeedAllowed = (nodeEnv = process.env.NODE_ENV) => {
  if (nodeEnv?.trim().toLowerCase() === 'production') {
    throw new Error(
      'The general demo seed is disabled in production. Use the category-only operational seed instead.',
    );
  }
};
