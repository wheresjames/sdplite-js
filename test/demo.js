#!/usr/bin/env nodejs
'use strict';

const sdplite = require('sdplite');

let strSdp =
`v=0
o=- 3845118995 3845118995 IN IP4 192.168.1.1
s=Conference 9277473501
t=0 0
a=group:BUNDLE 0 1
a=msid-semantic: WMS janus
m=video 9 UDP/TLS/RTP/SAVPF 101 102
c=IN IP4 192.168.1.1
a=candidate:1 1 udp 2013266431 192.168.1.1 57104 typ host
a=candidate:3 1 udp 503316991 127.0.0.1 61916 typ relay raddr 192.168.1.2 rport 57104
a=end-of-candidates
a=ice-ufrag:7Dzw
a=ice-pwd:PNJIxYcT196n5BxP7es+/R
a=ice-options:trickle
a=fingerprint:sha-256 72:40:EB:E8:C6:BB:DF:A4:59:16:60:7C:48:B8:B3:0E:EE:20:A5:2B:F0:99:8A:7B:EC:8C:12:6C:EA:E6:72:DD
a=setup:active
a=rtpmap:101 H264/90000
a=rtpmap:102 rtx/90000
a=rtcp-fb:101 ccm fir
a=rtcp-fb:101 nack
a=rtcp-fb:101 nack pli
a=rtcp-fb:101 goog-remb
a=rtcp-fb:101 transport-cc
a=fmtp:101 profile-level-id=42e01f;packetization-mode=1
a=fmtp:102 apt=101
a=extmap:1 urn:ietf:params:rtp-hdrext:sdes:mid
a=msid:janus janusv0
a=ssrc:646734008 cname:janus
a=ssrc:646734008 msid:janus janusv0
a=ssrc:646734008 mslabel:janus
a=ssrc:646734008 label:janusv0
a=recvonly
a=mid:0
a=rtcp-mux
m=audio 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 192.168.1.1
a=candidate:1 1 udp 2013266431 192.168.1.1 57104 typ host
a=candidate:3 1 udp 503316991 127.0.0.1 61916 typ relay raddr 192.168.1.2 rport 57104
a=end-of-candidates
a=ice-ufrag:7Dzw
a=ice-pwd:PNJIxYcT196n5BxP7es+/R
a=ice-options:trickle
a=fingerprint:sha-256 72:40:EB:E8:C6:BB:DF:A4:59:16:60:7C:48:B8:B3:0E:EE:20:A5:2B:F0:99:8A:7B:EC:8C:12:6C:EA:E6:72:DD
a=setup:active
a=rtpmap:96 opus/48000/2
a=extmap:1 urn:ietf:params:rtp-hdrext:sdes:mid
a=msid:janus janusa0
a=ssrc:1024578329 cname:janus
a=ssrc:1024578329 msid:janus janusa0
a=ssrc:1024578329 mslabel:janus
a=ssrc:1024578329 label:janusa0
a=recvonly
a=mid:1
a=rtcp-mux
`;

// Parse the SDP
let sdp = sdplite.parseSDP(strSdp);

// Rebuild the SDP
let strReSdp = sdplite.makeSDP(sdp);

// Compare the two SDP's
let e = sdplite.compareSDP(strSdp, strReSdp);
if (e !== true)
    throw e;

