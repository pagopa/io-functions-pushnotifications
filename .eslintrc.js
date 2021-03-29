module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "ignorePatterns": [
        "node_modules",
        "generated",
        "**/__tests__/*",
        "**/__mocks__/*",
        "Dangerfile.*",
        "*.d.ts"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "extends": [
        "@pagopa/eslint-config/strong",
    ],
    "rules": {
        "prefer-arrow/prefer-arrow-functions": "off",
        "@typescript-eslint/naming-convention": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "no-invalid-this": "off",
        "@typescript-eslint/no-unused-expressions": "off",
        "@typescript-eslint/no-explicit-any":"off",
        "id-blacklist":"off",
        "@typescript-eslint/ban-types":"off",
        "sort-keys":"off",
        "no-underscore-dangle":"off",
        "functional/prefer-readonly-type":"off",
        "@typescript-eslint/dot-notation": "off"
    }
}
