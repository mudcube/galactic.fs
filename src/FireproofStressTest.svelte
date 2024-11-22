<script>
    import { fireproof } from '@fireproof/core'

    let testResults = []
    let isRunning = false

    // Test configuration
    let numberOfFiles = 10
    let imageWidth = 1024
    let imageHeight = 768
    let jsonSize = 100

    $: imageSizeMB = ((imageWidth * imageHeight * 4) / (1024 * 1024)).toFixed(2)

    function generateLorem(paragraphs) {
        const words = [ 'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
            'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
            'magna', 'aliqua' ]

        const paragraphArray = []
        for (let p = 0; p < paragraphs; p++) {
            let paragraph = ''
            const sentenceCount = 5 + Math.floor(Math.random() * 5)

            for (let s = 0; s < sentenceCount; s++) {
                const wordCount = 8 + Math.floor(Math.random() * 8)
                let sentence = ''

                for (let w = 0; w < wordCount; w++) {
                    sentence += words[Math.floor(Math.random() * words.length)] + ' '
                }
                paragraph += sentence.trim() + '. '
            }
            paragraphArray.push(paragraph)
        }
        return paragraphArray
    }

    function createRandomCanvas(width, height) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        const imageData = ctx.createImageData(width, height)
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = Math.floor(Math.random() * 256)     // R
            imageData.data[i + 1] = Math.floor(Math.random() * 256) // G
            imageData.data[i + 2] = Math.floor(Math.random() * 256) // B
            imageData.data[i + 3] = 255                             // A
        }
        ctx.putImageData(imageData, 0, 0)
        return canvas
    }

    async function runTest(name, testFn) {
        try {
            const startTime = performance.now()
            await testFn()
            const duration = ((performance.now() - startTime) / 1000).toFixed(2)
            testResults = [ ...testResults, { name, passed: true, duration } ]
        } catch (error) {
            testResults = [ ...testResults, { name, passed: false, error: error.message } ]
        }
    }

    async function runJsonTest() {
        const db = fireproof('json-test-db')
        const docIds = [] // Store IDs for cleanup

        await runTest(`Store ${ numberOfFiles } JSON documents`, async () => {
            for (let i = 0; i < numberOfFiles; i++) {
                const doc = {
                    type: 'lorem',
                    id: `json-${ i }`,
                    timestamp: new Date().toISOString(),
                    paragraphs: generateLorem(jsonSize)
                }
                const result = await db.put(doc)
                docIds.push(result.id)
            }
        })

        return docIds // Return IDs for cleanup
    }

    async function runImageTest() {
        const db = fireproof('image-test-db')
        const docIds = [] // Store IDs for cleanup

        await runTest(`Store ${ numberOfFiles } images (${ imageSizeMB }MB each)`, async () => {
            for (let i = 0; i < numberOfFiles; i++) {
                const canvas = createRandomCanvas(imageWidth, imageHeight)
                const mainImage = await new Promise(resolve => {
                    canvas.toBlob(blob => {
                        resolve(new File([ blob ], `image-${ i }.png`, { type: 'image/png' }))
                    }, 'image/png')
                })

                const doc = {
                    type: 'image',
                    id: `img-${ i }`,
                    timestamp: new Date().toISOString(),
                    _files: {
                        [`image-${ i }.png`]: mainImage
                    }
                }
                const result = await db.put(doc)
                docIds.push(result.id)
            }
        })

        return docIds // Return IDs for cleanup
    }

    async function cleanup(jsonIds, imageIds) {
        await runTest('Cleanup databases', async () => {
            const jsonDb = fireproof('json-test-db')
            const imageDb = fireproof('image-test-db')

            // Clean up JSON docs
            for (const id of jsonIds) {
                await jsonDb.del(id)
            }

            // Clean up image docs
            for (const id of imageIds) {
                await imageDb.del(id)
            }
        })
    }

    async function runTests() {
        if (isRunning) return

        isRunning = true
        testResults = []

        try {
            const jsonIds = await runJsonTest()
            const imageIds = await runImageTest()
            await cleanup(jsonIds, imageIds)
        } catch (error) {
            console.error('Test error:', error)
            testResults = [ ...testResults, {
                name: 'Test Suite Error',
                passed: false,
                error: error.message
            } ]
        } finally {
            isRunning = false
        }
    }
</script>

<main>
    <h1>Fireproof Data Tests</h1>

    <div>
        <label>
            Number of files:
            <input type="number" bind:value={numberOfFiles} min="1" max="100" disabled={isRunning}>
        </label>
    </div>

    <div>
        <label>
            Image width:
            <input type="number" bind:value={imageWidth} min="1" max="4096" disabled={isRunning}>
        </label>
    </div>

    <div>
        <label>
            Image height:
            <input type="number" bind:value={imageHeight} min="1" max="4096" disabled={isRunning}>
        </label>
    </div>

    <div>
        <label>
            Paragraphs per JSON:
            <input type="number" bind:value={jsonSize} min="1" max="1000" disabled={isRunning}>
        </label>
    </div>

    <p>Expected image size: {imageSizeMB} MB each</p>

    <button on:click={runTests} disabled={isRunning}>
        {isRunning ? 'Running Tests...' : 'Run Tests'}
    </button>

    <div>
        {#each testResults as result}
            <div>
                <span>{result.name}</span>
                {#if result.passed}
                    <span>✓ ({result.duration}s)</span>
                {:else}
                    <span>✗ {result.error}</span>
                {/if}
            </div>
        {/each}
    </div>
</main>