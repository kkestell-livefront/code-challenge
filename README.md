# ligma

## Table of Contents

- [ligma](#ligma)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Running Locally](#running-locally)
  - [Scripts](#scripts)
  - [Project Structure](#project-structure)
  - [Browser Compatibility](#browser-compatibility)
    - [Desktop](#desktop)
    - [Mobile](#mobile)
    - [Device and screen size support](#device-and-screen-size-support)
  - [Dependencies](#dependencies)
    - [Runtime Dependencies](#runtime-dependencies)
    - [Development Dependencies](#development-dependencies)

## Getting Started

### Prerequisites

- [Node.js 24](https://nodejs.org/en/download/package-manager) (see `.nvmrc`)

### Running Locally

1. If using `nvm` to manage Node versions, run `nvm use` to switch to the project-defined version.
2. Run: `npm install`
3. Run: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Scripts

NPM scripts provide commands for working with the codebase.

| Script        | Description                                 |
| ------------- | ------------------------------------------- |
| build         | Builds the application for production.      |
| dev           | Starts the development server.              |
| start         | Starts the production server.               |
| lint          | Runs eslint                                 |
| test          | Runs unit tests using Vitest                |
| test:coverage | Runs unit tests with test coverage display  |
| prettier      | Checks code formatting with prettier        |
| prettier:fix  | Formats all files in codebase with prettier |

## Project Structure

See [AGENTS.md](./AGENTS.md) for project conventions.

- `/`
  - Files related to configuration of NextJS and tooling.
- `app/` - Folder structure for [routing](https://nextjs.org/docs/app/getting-started/project-structure#folder-and-file-conventions).
- `components/`
  - `global/` - Components that are used across multiple pages.
  - `elements/` - General UI elements
  - `loaders/` - Loading state elements
  - `<feature>/` - Feature specific components
- `constants/` - Contains constant values and configurations used throughout the project.
- `public/` - Serves static assets.
- `types/` - Defines TypeScript types used throughout the codebase.
- `lib/` - Utility functions and helper modules that provide common functionality.
- `assets/` - Assets used in components
  - `svg/` - SVG specific assets

## Browser Compatibility

### Desktop

Supports the three most recent versions of Chrome, Safari, and Firefox.

### Mobile

Supports all popular browsers found on Android 10+ (SDK 29+) and iOS 14+.

### Device and screen size support

Responsive support for a full range of device sizes from minimal mobile phone screens (approx. 320px wide) to tablets to large desktop monitors (2000+px wide). Mobile devices supported in portrait and landscape orientations.

## Dependencies

The source of truth for this list is [package.json](./package.json)

### Runtime Dependencies

| Name                            | Description                                                 | License |
| ------------------------------- | ----------------------------------------------------------- | ------- |
| [next](https://nextjs.org)      | The React Framework                                         | MIT     |
| [react](https://react.dev/)     | React is a JavaScript library for building user interfaces. | MIT     |
| [react-dom](https://react.dev/) | React package for working with the DOM.                     | MIT     |

### Development Dependencies

| Name                                                                                                       | Description                                                                                                | License      |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| [@tailwindcss/postcss](https://tailwindcss.com)                                                            | PostCSS plugin for Tailwind CSS, a utility-first CSS framework for rapidly building custom user interfaces | MIT          |
| [@testing-library/dom](https://github.com/testing-library/dom-testing-library#readme)                      | Simple and complete DOM testing utilities that encourage good testing practices.                           | MIT          |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom#readme)                            | Custom jest matchers to test the state of the DOM                                                          | MIT          |
| [@testing-library/react](https://github.com/testing-library/react-testing-library#readme)                  | Simple and complete React DOM testing utilities that encourage good testing practices.                     | MIT          |
| [@testing-library/user-event](https://github.com/testing-library/user-event#readme)                        | Fire events the same way the user does                                                                     | MIT          |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node)                   | TypeScript definitions for node                                                                            | MIT          |
| [@types/react](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react)                 | TypeScript definitions for react                                                                           | MIT          |
| [@types/react-dom](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom)         | TypeScript definitions for react-dom                                                                       | MIT          |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#readme) | The default Vite plugin for React projects                                                                 | MIT          |
| [@vitest/coverage-v8](https://github.com/vitest-dev/vitest/tree/main/packages/coverage-v8#readme)          | V8 coverage provider for Vitest                                                                            | MIT          |
| [autoprefixer](https://github.com/postcss/autoprefixer#readme)                                             | Parse CSS and add vendor prefixes to CSS rules using values from the Can I Use website                     | MIT          |
| [eslint](https://eslint.org)                                                                               | An AST-based pattern checker for JavaScript.                                                               | MIT          |
| [eslint-config-next](https://nextjs.org/docs/app/api-reference/config/eslint)                              | ESLint configuration used by Next.js.                                                                      | MIT          |
| [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import)                                  | Import with sanity.                                                                                        | MIT          |
| [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc#readme)                                 | JSDoc linting rules for ESLint.                                                                            | BSD-3-Clause |
| [jsdom](https://github.com/jsdom/jsdom#readme)                                                             | A JavaScript implementation of many web standards                                                          | MIT          |
| [postcss](https://postcss.org/)                                                                            | Tool for transforming styles with JS plugins                                                               | MIT          |
| [prettier](https://prettier.io)                                                                            | Prettier is an opinionated code formatter                                                                  | MIT          |
| [tailwindcss](https://tailwindcss.com)                                                                     | A utility-first CSS framework for rapidly building custom user interfaces.                                 | MIT          |
| [tinyglobby](https://superchupu.dev/tinyglobby)                                                            | A fast and minimal alternative to globby and fast-glob                                                     | MIT          |
| [typescript](https://www.typescriptlang.org/)                                                              | TypeScript is a language for application scale JavaScript development                                      | Apache-2.0   |
| [vite](https://vite.dev)                                                                                   | Native-ESM powered web dev build tool                                                                      | MIT          |
| [vitest](https://github.com/vitest-dev/vitest#readme)                                                      | Next generation testing framework powered by Vite                                                          | MIT          |
