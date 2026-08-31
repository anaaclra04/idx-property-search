module.exports = {
  testEnvironment: 'node',
  // Only the route handlers are covered — db.js opens a real connection pool
  // on require() and index.js just wires everything together, neither is
  // meaningfully unit-testable without a live database.
  collectCoverageFrom: ['routes/*.js'],
  coverageThreshold: {
    './routes/': {
      statements: 70,
      lines: 70,
    },
  },
};