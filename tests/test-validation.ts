
import { validateModel, ALLOWED_MODELS } from '../src/lib/validation';

function runTests() {
  console.log('Running validation tests...');
  let errors = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
    } else {
      console.error(`❌ FAIL: ${message}`);
      errors++;
    }
  }

  // Test 1: Valid models
  console.log('\nTesting valid models:');
  ALLOWED_MODELS.forEach(model => {
    const result = validateModel(model);
    assert(result.valid === true, `Model '${model}' should be valid`);
  });

  // Test 2: Invalid model
  console.log('\nTesting invalid models:');
  const invalidModel = 'gemini-ultra-fake';
  const resultInvalid = validateModel(invalidModel);
  assert(resultInvalid.valid === false, `Model '${invalidModel}' should be rejected`);
  assert(resultInvalid.error === 'Invalid model selected', 'Error message should match for invalid model');

  // Test 3: Non-string model
  console.log('\nTesting non-string input:');
  const nonStringInput = 123;
  // @ts-ignore
  const resultNonString = validateModel(nonStringInput);
  assert(resultNonString.valid === false, 'Non-string model should be rejected');
  assert(resultNonString.error === 'Model must be a string', 'Error message should match for non-string');

  // Test 4: Optional model (undefined/null)
  console.log('\nTesting optional/null input (fallback behavior):');
  const resultUndefined = validateModel(undefined);
  assert(resultUndefined.valid === true, 'Undefined model should be valid (fallback to default)');

  const resultNull = validateModel(null);
  assert(resultNull.valid === true, 'Null model should be valid (fallback to default)');

  if (errors > 0) {
    console.error(`\nTests failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed successfully!');
  }
}

runTests();
