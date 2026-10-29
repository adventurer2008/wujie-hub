"""Verify public metadata, every listed release file and its SHA-256 on the new host."""
import hashlib, json, urllib.request

BASE = 'https://user.wujiesync.cc/download/'

class SameSiteRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        assert newurl.startswith(BASE), 'Unexpected redirect: ' + newurl
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def verify():
    opener = urllib.request.build_opener(SameSiteRedirect())
    def fetch(url):
        assert url.startswith(BASE), 'Unexpected download source: ' + url
        with opener.open(url, timeout=30) as response:
            assert response.status == 200 and response.url.startswith(BASE)
            return response.read()
    feed = json.loads(fetch(BASE+'releases.json'))
    alpha = json.loads(fetch(BASE+'alpha/releases.json'))
    assert all(r['baseUrl'].startswith(BASE) for r in alpha['releases'])
    receipt = []
    for release in feed['releases']:
        for file, expected in release['sha256'].items():
            assert file in ('main.js', 'manifest.json', 'styles.css')
            data = fetch(release['baseUrl']+file)
            assert hashlib.sha256(data).hexdigest() == expected, release['version']+'/'+file
            if file == 'manifest.json':
                manifest = json.loads(data)
                assert manifest['id'] == 'wujie-sync' and manifest['version'] == release['version']
        if release.get('zipUrl'):
            assert hashlib.sha256(fetch(release['zipUrl'])).hexdigest() == release['zipSha256']
        receipt.append({'version':release['version'],'channel':release['channel'],'baseUrl':release['baseUrl'],'sha256Verified':True})
    print(json.dumps({'site':BASE,'releases':receipt,'oldHostUsed':False}))

if __name__ == '__main__': verify()
