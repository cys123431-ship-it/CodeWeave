import { createLearningServer } from './server/learning-server.mjs';

// The ordinary CLI remains C-only. Rust cannot be enabled through environment flags.
const app = createLearningServer();
const address = await app.listen(Number(process.env.PORT || 4173));
console.log('CodeWeave local learning app: http://127.0.0.1:' + address.port +
  '\n주의: C 코드 실행은 격리되지 않은 개인 PC용 개발 기능입니다. 공용 서버로 배포하지 마세요.');
