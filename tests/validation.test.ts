
import { validateModel, ALLOWED_MODELS } from '@/lib/validation';

async function testValidateModel() {
    console.log('Testing validateModel...');

    // Test Valid Models
    for (const model of ALLOWED_MODELS) {
        const result = validateModel(model);
        if (!result.valid) {
            console.error(`❌ validateModel failed for valid model: ${model}`, result.error);
            process.exit(1);
        }
    }
    console.log('✅ Valid models passed.');

    // Test Undefined/Null (should be valid as they mean "use default")
    const resultUndefined = validateModel(undefined);
    if (!resultUndefined.valid) {
        console.error('❌ validateModel failed for undefined');
        process.exit(1);
    }
    const resultNull = validateModel(null);
    if (!resultNull.valid) {
        console.error('❌ validateModel failed for null');
        process.exit(1);
    }
    const resultEmpty = validateModel('');
    if (!resultEmpty.valid) {
        console.error('❌ validateModel failed for empty string');
        process.exit(1);
    }
    console.log('✅ Optional input check passed.');

    // Test Invalid Models
    const invalidModels = ['gpt-4', 'claude-3', 'gemini-bad-model', '<script>alert(1)</script>'];
    for (const model of invalidModels) {
        const result = validateModel(model);
        if (result.valid) {
            console.error(`❌ validateModel SHOULD fail for invalid model: ${model}`);
            process.exit(1);
        }
    }
    console.log('✅ Invalid models rejected.');

    // Test Invalid Types
    const invalidTypes = [123, {}, []];
    for (const model of invalidTypes) {
        const result = validateModel(model);
        if (result.valid) {
            console.error(`❌ validateModel SHOULD fail for invalid type: ${typeof model}`);
            process.exit(1);
        }
    }
    console.log('✅ Invalid types rejected.');

    console.log('🎉 All validateModel tests passed!');
}

testValidateModel().catch(e => {
    console.error('Test failed with exception:', e);
    process.exit(1);
});
