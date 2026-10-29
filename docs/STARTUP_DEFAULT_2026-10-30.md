# File Resynthesis startup default — 2026-10-30

Status: local implemented/verified candidate, not committed/deployed. User requested File Resynthesis as the default after observing that the original Oscillator + File IR startup did not load an example.

Both initial HTML selected/hidden states and runtime initialization select File Resynthesis. After transport mounting, call the existing guarded example loader once. Existing48k decode, input admission, chosen-channel analysis,32/64 partial policy, static partial-bank synthesis and per-mode curves remain byte-identical. Loading/analyzing does not start realtime audio. This is analysis-based resynthesis, not playback of the Bach melody. The example remains an analysis source, never an automatically installed IR. Explicit Open Audio keeps its existing dual analysis/IR meaning. Mode change/file import ownership and failed-load recovery use the existing generation gate; no second loader or decoder is introduced.

Chrome/Brave:8 scenarios cover initial ready/no-autoplay/no-IR,32/64 refresh/play/end/WAV, initial HTTP failure+user file recovery, newer user file winning a delayed example, delayed example cancellation on mode switch.900/390px layout checks pass. Synthesis/IR/limiter algorithms are not changed. Actual native125/150% zoom, listening and other browser engines are not newly certified. See coordinating evidence /Users/hyunsukjun/Documents/ChatGPT/4.프로그램.완료/work/CurveLabWebV1/qa/web-stability-batch1-20261030.

Standalone asset: initial mode, visible loading/readiness and source-vs-IR role are separate contracts. Bundle/HTTP choice is platform-specific; preserve no-autoplay, newest-owner semantics and distinct curve stores. No Native code/start approval from this record.


## User release authorization — 2026-10-30

The user approved commit and public deployment on2026-10-30, together with the reviewed IR-body/AC-analysis corrections. Publication is verified separately; no autoplay, implicit IR or listening acceptance is added.
