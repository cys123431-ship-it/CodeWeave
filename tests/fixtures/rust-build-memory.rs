// Trusted CI compiler-memory probe, not a learner exercise or executable server.
// The repeated array requests 2 GiB during constant evaluation under the existing
// bounded Cargo/rustc address-space policy. No runtime allocation is performed.
const LARGE: [u8; 2_147_483_648] = [7; 2_147_483_648];

pub fn value() -> i32 {
    LARGE[0] as i32
}
