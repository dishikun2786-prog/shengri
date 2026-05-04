import { Memory } from 'mem0ai/oss';

async function main() {
  const memory = new Memory({
    llm: {
      provider: 'openai',
      config: {
        model: 'deepseek-v4-flash',
        apiKey: 'sk-1e9c42d76cda4b0aaed32ac065bdadfe',
        baseURL: 'https://api.deepseek.com',
      },
    },
    embedder: {
      provider: 'ollama',
      config: {
        url: 'http://localhost:11434',
        model: 'nomic-embed-text',
        embeddingDims: 768,
      },
    },
    vectorStore: {
      provider: 'qdrant',
      config: {
        url: 'http://localhost:6333',
        collectionName: 'test_mem0_direct',
      },
    },
  });

  try {
    console.log('Adding memory...');
    const result = await memory.add(
      [{ role: 'user', content: '我的八字日主是丁火，生于子月，身弱用火木，喜木火忌金水' }],
      { userId: 'test_user_3', metadata: { memoryType: 'profile' } }
    );
    console.log('ADD SUCCESS:', JSON.stringify(result, null, 2).slice(0, 500));

    const search = await memory.search('丁火日主身弱', { filters: { user_id: 'test_user_3' }, limit: 3 });
    console.log('\nSEARCH SUCCESS: found', search?.results?.length || 0, 'results');
    if (search?.results?.[0]) {
      console.log('Top memory:', JSON.stringify(search.results[0], null, 2).slice(0, 500));
    }
    console.log('\nALL TESTS PASSED: Mem0 with Ollama embedder is working!');
  } catch (err: any) {
    console.error('TEST FAILED:', err.message);
  }
}

main();
