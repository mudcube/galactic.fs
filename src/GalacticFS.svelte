<script>
    import { GalacticFS } from './GalacticFS/GalacticFS.js'
    import { onMount } from 'svelte'

    let testResults = []
    let isRunning = false

    onMount(() => {
        runTests()
    })

    async function runTest(name, testFn, cleanupFn) {
        try {
            await testFn()
            testResults = [ ...testResults, { name, passed: true } ]
        } catch (error) {
            testResults = [ ...testResults, { name, passed: false, error: error.message } ]
        } finally {
            if (cleanupFn) {
                try {
                    await cleanupFn()
                } catch (e) {
                    console.error('Cleanup error:', e)
                }
            }
        }
    }

    async function runTests() {
        isRunning = true
        testResults = []

        const fs = new GalacticFS('test-storage')

        // Test basic file operations
        await runTest('Write and read file', async () => {
            await fs.write('/test.txt', 'Hello World')
            const file = await fs.read('/test.txt')
            console.log(file)
            // const content = await file.get('string');
            // if (content !== 'Hello World') {
            //     throw new Error(`Expected "Hello World", got "${content}"`);
            // }
        }, async () => {
            await fs.delete('/test.txt')
        })

        // Test folder operations
        await runTest('Create and read folder', async () => {
            await fs.write('/folder/', {
                'file1.txt': 'Content 1',
                'file2.txt': 'Content 2'
            })
            const folder = await fs.read('/folder/')
            const files = await folder.get('entry', 'array')
            if (files.length !== 2) throw new Error(`Expected 2 files, got ${ files.length }`)
        })

        // Test file copying
        await runTest('Copy file', async () => {
            await fs.write('/source.txt', 'test content')
            await fs.copy('/source.txt', '/dest.txt')
            const dest = await fs.read('/dest.txt')
            const content = await dest.get('string')
            if (content !== 'test content') throw new Error('File content mismatch after copy')
        })

        // Clean up
        try {
            await fs.delete('/test.txt')
            await fs.delete('/folder/')
            await fs.delete('/source.txt')
            await fs.delete('/dest.txt')
        } catch (e) {
            console.error('Cleanup error:', e)
        }

        isRunning = false
    }
</script>

<main class="container">
    <h1>GalacticFS Browser Tests</h1>

    <button on:click={runTests} disabled={isRunning}>
        {isRunning ? 'Running Tests...' : 'Run Tests'}
    </button>

    <div class="results">
        {#each testResults as result}
            <div class="test-result {result.passed ? 'passed' : 'failed'}">
                <span class="test-name">{result.name}</span>
                {#if !result.passed}
                    <span class="error">{result.error}</span>
                {/if}
            </div>
        {/each}
    </div>
</main>

<style>
    .container {
        padding: 20px;
    }

    button {
        margin: 20px 0;
        padding: 10px 20px;
    }

    .results {
        margin-top: 20px;
    }

    .test-result {
        padding: 10px;
        margin: 5px 0;
        border-radius: 4px;
    }

    .passed {
        background-color: #e6ffe6;
        color: #006600;
    }

    .failed {
        background-color: #ffe6e6;
        color: #660000;
    }

    .error {
        display: block;
        font-size: 0.9em;
        margin-top: 5px;
    }
</style>