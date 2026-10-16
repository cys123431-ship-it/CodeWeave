// Trusted fixture builds only. No production compiler/runtime policy changes.
export function rustFixtureFlags(platform = process.platform, arch = process.arch) {
  return ['-Dwarnings', ...(platform === 'linux' && arch === 'x64' ? ['-Clinker-features=-lld'] : [])];
}

export function withRustFixtureLinker(environment, platform = process.platform, arch = process.arch) {
  return { ...environment, RUSTFLAGS: rustFixtureFlags(platform, arch).join(' ') };
}
