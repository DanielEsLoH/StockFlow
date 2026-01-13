// Global mock for @arcjet/node module
// This mock is used automatically by Jest for all test files

export const detectBot = jest.fn().mockReturnValue({});
export const fixedWindow = jest.fn().mockReturnValue({});
export const shield = jest.fn().mockReturnValue({});
export const slidingWindow = jest.fn().mockReturnValue({});
export const tokenBucket = jest.fn().mockReturnValue({});

const arcjet = jest.fn().mockReturnValue({
  protect: jest.fn().mockResolvedValue({
    isAllowed: () => true,
    isDenied: () => false,
  }),
});

export default arcjet;
