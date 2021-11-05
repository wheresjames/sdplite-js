#!/usr/bin/env nodejs
'use strict';

const fs = require('fs');
const path = require('path');

function loadConfig(fname)
{   if (!fs.existsSync(fname))
        return {};
    let r = {};
    let data = fs.readFileSync(fname, 'utf8');
    let lines = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    lines.forEach(v =>
        {   v = v.trim();
            if ('#' != v[0])
            {   let parts = v.split(/\s+/);
                if (1 < parts.length)
                {   let k = parts.shift().trim().toLowerCase();
                    r[k] = parts.join(' ');
                }
            }
        });
    return r;
}

module.exports =
{
    __info__    : loadConfig(path.join(path.dirname(__dirname), 'PROJECT.txt')),
    parseSDP    : parseSDP,
    makeSDP     : makeSDP,
    compareSDP  : compareSDP
};


/** Compare two SDP
    @param [in] a    - First SDP
    @param [in] b    - Second SDP

    @return Returns true if both match, otherwise a string describing the error
*/
function compareSDP(a, b)
{
    if (typeof a === 'object' && !Array.isArray(a))
        a = a.sdp;
    if (typeof b === 'object' && !Array.isArray(b))
        b = b.sdp;

    // Remove CR
    if (!Array.isArray(a))
        a = a.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (!Array.isArray(b))
        b = b.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    // Remove empty lines
    for (let _a = 0; a.length && _a < a.length; _a++)
    {   a[_a] = a[_a].trim();
        if (!a[_a] || !a[_a].length)
            a.splice(_a--, 1);
    }
    for (let _b = 0; b.length && _b < b.length; _b++)
    {   b[_b] = b[_b].trim();
        if (!b[_b] || !b[_b].length)
            b.splice(_b--, 1);
    }

    // Compare
    for (let _a = 0; a.length && _a < a.length; _a++)
    {
        let found = false;
        for (let _b = 0; b.length && _b < b.length; _b++)
        {
            if (a[_a] == b[_b])
            {   a.splice(_a--, 1); // delete a[_a]
                b.splice(_b--, 1); // delete b[_b]
                found = true;
                break;
            }
        }

        if (!found)
            return `Failed to find: ${a[_a]}\r\n in \r\n${b.join("\r\n")}`;
    }

    if (b.length)
        return `Extra data in b \r\n${b.join("\r\n")}`;

    return true;
}


/** Returns input as an integer if it in fact fits in an integer
    @param [in] s   - String to convert to integer
    @return s as integer if it fits in an integer
*/
function toInt(s)
{
    if (typeof s !== 'string' || !s.match(/^[0-9]+$/))
        return s;
    let n = parseInt(s);
    if (String(n) != s)
        return s;
    return n;
}


/** Adds v to o and returns o if o is valid, otherwise returns v
    @param [in] o    - Existing object
    @param [in] v    - Value
*/
function addVal(o, v, ign='')
{
    // if (typeof v === 'string')
    //     v = v.trim();

    if (v == ign)
        v = '';
    else
        v = toInt(v);

    // Return value if first of kind
    if (!o)
        return v;

    // Add to array if already exists
    let r = Array.isArray(o) ? o : [o];
    r.push(v);

    return r;
}

/** Parses string array of values
    @param [in] o   - Existing object
    @param [in] a   - String of array values
    @param [in] ks  - Key value names
    @param [in] m   - Non-zero if merging values
    @param [in] sep - Separator for string array in a
    @param [in] ext - Name of key in which to save extra values
    @param [in] ign - Array value to ignore
*/
function parseArr(o, a, ks, m=false, sep=' ', ext='__extra__', ign='')
{
    let r = (m && o) ? o : {};
    let p = a.split(sep);

    // Get primary values
    let rk = null;
    for (let k in ks)
        if (k < p.length)
        {
            p[k] = toInt(p[k].trim());

            // Is this a key?
            if (!ks[k])
                rk = p[k];

            else if (rk)
            {   if (!(rk in r))
                    r[rk] = {}
                r[rk][ks[k]] = (!ign || p[k] != ign) ? p[k] : '';
            }

            else
                r[ks[k]] = (!ign || p[k] != ign) ? p[k] : '';
        }

    // Save anything extra we find
    if (ks.length < p.length)
        if (rk !== null && !ext)
            r[rk] = addVal(r[rk], p.slice(ks.length).join(sep), ign);
        else if (ext)
        {   r[ext] = {};
            let extra = p.slice(ks.length)
            for(let k in extra)
                r[ext][ks.length + parseInt(k)] = toInt(extra[k].trim());
        }

    // Return value if merging or first of kind
    if (m || !o)
        return r;

    // Add to array if already exists
    let ra = Array.isArray(o) ? o : [o];
    ra.push(r);

    return ra;
}


/** Parses SDP
    @param [in] sdp             - SDP data
    @param [in] ignoreErrors    - Non-zero to ignore errors, if zero or false,
                                  exception is thrown on parsing errors.

    @return Object containing parsed SDP data

    https://datatracker.ietf.org/doc/html/rfc4566
    https://datatracker.ietf.org/doc/html/rfc8841
*/
function parseSDP(sdp, ignoreErrors=false)
{
    if (typeof sdp === 'object' && sdp.sdp)
        sdp = sdp.sdp;

    let lines;
    if (typeof sdp === 'string')
        lines = sdp.replace(/\r/g, "\n").split("\n");
    else if (Array.isArray(sdp))
        lines = sdp;
    else
        throw 'Invalid SDP';

    let ln = 0;
    let p = {'main':{}}, sel = null;
    for (let l of lines)
    {
        ln++;

        l = String(l).trim();
        if (2 >= l.length)
            continue;

        if ('=' != l[1])
        {   if (!ignoreErrors)
                throw`Unknown line ${ln} in SDP: ${l}`;
            continue;
        }

        let k = l.slice(0, 1);
        let v = l.slice(2);

        let cs = sel ? sel : p['main'];
        switch(k)
        {
            // a=* (zero or more session attribute lines)
            case 'a':
            {
                // Split into key / value
                let arr = v.split(':');
                if (0 >= arr.length)
                {   if (!ignoreErrors)
                        throw `Inavlid attribute in SDP at ${ln}: ${k} = ${v}`;
                    continue;
                }

                // Save processed key/value pair
                arr = {k: arr[0], v: arr.splice(1).join(':')};
                if (!arr || !arr.k)
                {   if (!ignoreErrors)
                        throw `Inavlid attribute in SDP at ${ln}: ${k} = ${v}`;
                    continue;
                }

                // Ensure we have an array
                if (!cs.attr)
                    cs.attr = {};

                // If there's no value, treat as boolean flag
                if (!arr.v)
                {   cs.attr[arr.k] = addVal(cs.attr[arr.k], true);
                    continue;
                }

                // Handle special values
                switch(arr.k)
                {
                    case 'fingerprint':
                        cs.attr[arr.k] = parseArr(cs.attr[arr.k], arr.v, ['type', 'hash']);
                         break;

                    case 'rtcp':
                        cs.attr[arr.k] = parseArr(cs.attr[arr.k], arr.v, ['idx', 'ntype', 'atype', 'addr']);
                        break;

                    case 'extmap':
                    case 'fmtp':
                    case 'rtpmap':
                    case 'rtcp-fb':
                        cs.attr[arr.k] = parseArr(cs.attr[arr.k], arr.v, [null], true, ' ', null);
                        break;

                    case 'candidate':
                        let n = ['foundation', 'protocol', 'component', 'priority', 'ip', 'port'];
                        cs.attr[arr.k] = parseArr(cs.attr[arr.k], arr.v, n);
                        let a = Array.isArray(cs.attr[arr.k]) ? cs.attr[arr.k][cs.attr[arr.k].length-1] : cs.attr[arr.k];
                        if (a)
                        {   a.__string__ = arr.v;
                            if (a.__extra__)
                            {   for(let k = 6; String(k) in a.__extra__ && String(k+1) in a.__extra__; k+=2)
                                    a[a.__extra__[String(k)]] = a.__extra__[String(k+1)];
                                delete a.__extra__;
                            }
                        }
                        break;

                    default:
                        cs.attr[arr.k] = addVal(cs.attr[arr.k], arr.v);
                        break;
                }

            } break;

            // b=* (zero or more bandwidth information lines)
            case 'b':
                cs.bandwidth = parseArr(cs.bandwidth, v, ['type', 'bw'], false, ':');
                break;

            // c=* (connection information -- optional if included at session level)
            case 'c':
            {   cs.connection = parseArr(cs.connection, v, ['ntype', 'atype', 'addr']);
                let a = Array.isArray(cs.connection) ? cs.connection[cs.connection.length-1] : cs.connection;
                if (a.addr)
                    a = parseArr(a, a.addr, ['ip', 'ttl', 'numAddr'], true, '/')
            } break;

            // e=* (email address)
            case 'e':
                cs.email = addVal(cs.email, v);
                break;

            // i=* (session information)
            case 'i':
                cs.desc = addVal(cs.desc, v);
                break;

            // k=* (encryption key)
            case 'k':
                cs.encryption = parseArr(cs.encryption, v, ['method', 'key'], false, ':');
                break;

            // m=  (media name and transport address)
            case 'm':
            {   p.media = parseArr(p.media, v, ['media', 'port', 'proto'], false, ' ', 'fmt');
                let a = Array.isArray(p.media) ? p.media[p.media.length-1] : p.media;
                if (a)
                    sel = a;
            } break;

            // o=  (originator and session identifier)
            case 'o':
                cs.origin = parseArr(cs.origin, v, ['user', 'sid', 'ver', 'ntype', 'atype', 'uaddr']);
                break;

            // p=* (phone number)
            case 'p':
                cs.phone = addVal(cs.phone, v);
                break;

            // r=* (zero or more repeat times)
            case 'r':
                cs.repeat = parseArr(cs.repeat, v, ['interval', 'duration', 'offset']);
                break;

            // s=  (session name)
            case 's':
                cs.session = addVal(cs.session, v);
                break;

            // t=  (time the session is active)
            case 't':
                cs.timing = parseArr(cs.timing, v, ['start', 'stop']);
                break;

            // u=* (URI of description)
            case 'u':
                cs.uri = addVal(cs.uri, v);
                break;

            // v=  (protocol version)
            case 'v':
                cs.version = addVal(cs.version, v);
                break;

            // z=* (time zone adjustments)
            case 'z':
                cs.timezone = parseArr(cs.timezone, v, ['time', 'offset']);
                break;

            default:
                if (!ignoreErrors)
                    throw `Unknown SDP line at ${ln}: ${k} = ${v}`;
                break;
            }
    }

    return p;
}

/** Returns the specified array key or the default value if not found
    @param [in] a   - Array
    @param [in] k   - Key in array
    @param [in] d   - Default value
*/
function _v(a, k, d='')
{
    let ka = k.split('.');
    for (let _k in ka)
        if (ka[_k] in a && (typeof a[ka[_k]] !== 'string' || a[ka[_k]].length))
            a = a[ka[_k]];
        else
            return d;
    return a;
}

/**
    @param [in] r       - Result array in which new lines will be appended
    @param [in] pre     - Prefix for line
    @param [in] arr     - Array containing data
    @param [in] opts    - Processing options
                            sep     - Line separator
                            mapped  - Non-zero if values are mapped with key
                            ka      - Value key array
                            def     - Default value array
                            ext     - Extra value key
*/
function _a(r, pre, arr, opts={})
{
    if (undefined === arr)
        return;

    // Default options
    if (!opts.sep)
        opts.sep = ' ';
    if (!opts.def)
        opts.def = [''];

    // If values are mapped by the first element
    if (opts.mapped)
    {
        for(let k in arr)
            if (!Array.isArray(arr[k]))
                r.push(pre + [k, arr[k]].join(opts.sep));
            else
                for(let i in arr[k])
                    r.push(pre + [k, arr[k][i]].join(opts.sep));
        return;
    }

    // If not an array, make it one
    if (!Array.isArray(arr))
        arr = [arr];

    // For each item
    for(let k in arr)
    {
        let a = arr[k];
        let v = [];

        // If values are mapped by key name
        if (opts.ka)
            for (let k in opts.ka)
                v.push(_v(a, opts.ka[k], opts.def[(k <= opts.def.length-1) ? k : opts.def.length-1]));

        // Boolean values are just flags
        else if (typeof a !== 'boolean')
            v.push(a);

        // Map extra data if a key name is specified
        if (opts.ext && opts.ext in a)
            for (let e in a[opts.ext])
                v.push(a[opts.ext][e]);

        // Push the new line
        r.push(pre + v.join(opts.sep));
    }
}

/**
    @param [in] r       - Result array in which new lines will be appended
    @param [in] p       - Data array pointer
*/
function makeSdpPart(r, p)
{
    _a(r, 'v=', p.version,      {def:"0"});
    _a(r, 'o=', p.origin,       {ka:['user', 'sid', 'ver', 'ntype', 'atype', 'uaddr'], def:['-', '']});
    _a(r, 's=', p.session,      {def:""});
    _a(r, 'c=', p.connection,   {ka:['ntype', 'atype', 'addr']});
    _a(r, 't=', p.timing,       {ka:['start', 'stop']});

    for (let k in p.attr)
    {
        let v = p.attr[k];
        switch(k)
        {
            case 'candidate':
                _a(r, `a=${k}:`, v, {ka:['__string__']});
                break;

            case 'fingerprint':
                _a(r, `a=${k}:`, v, {ka:['type', 'hash']});
                break;

            case 'rtpmap':
            case 'rtcp-fb':
            case 'fmtp':
            case 'extmap':
                _a(r, `a=${k}:`, v, {mapped:true});
                break;

            case 'rtcp':
                _a(r, `a=${k}:`, v, {ka:['idx', 'ntype', 'atype', 'addr']});
                break;

            default :
                if (typeof v !== 'boolean')
                    k += ':';
                _a(r, `a=${k}`, v);
                break;
        }
    }
}

/** Create SDP from parsed object
    @param [in] sdp         - Parsed SDP object
    @param [in] joinWith    - String to join lines together
                                If null returns an array

    @return Returns the SDP from the parsed object
*/
function makeSDP(sdp, joinWith="\r\n")
{
    let r = [];

    // Default
    if (!sdp.main.version)
        sdp.main.version = 0;
    if (!sdp.main.session)
        sdp.main.session = '';

    // Add main section
    makeSdpPart(r, sdp.main);

    // Add media sections
    if (sdp.media)
        for (let m of sdp.media)
        {   _a(r, 'm=', m, {ka:['media', 'port', 'proto'], ext:'fmt'});
            makeSdpPart(r, m);
        }

    return joinWith ? (r.join(joinWith) + joinWith) : r;
}
