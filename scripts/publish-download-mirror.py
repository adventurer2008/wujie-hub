"""Publish preverified immutable stable files and canonical public download indexes."""
import argparse, datetime, fcntl, hashlib, json, os, pathlib, shutil

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', required=True)
    parser.add_argument('--root', default='/var/www/wujie-download')
    args = parser.parse_args()
    root = pathlib.Path(args.root).resolve(strict=True)
    stage = pathlib.Path(args.stage).resolve(strict=True)
    assert str(root) == '/var/www/wujie-download'
    lock = open('/root/wujie-alpha-publication.lock', 'a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    records = json.loads((stage/'stable-releases.json').read_text())['releases']
    for release in records:
        version = release['version']
        import re
        assert re.fullmatch(r'\d+\.\d+\.\d+', version)
        assert release['baseUrl'] == f'https://user.wujiesync.cc/download/stable/{version}/'
        source = stage/'stable'/version
        for file, expected in release['sha256'].items():
            assert file in ('main.js', 'manifest.json', 'styles.css')
            assert not (source/file).is_symlink() and digest(source/file) == expected
        manifest = json.loads((source/'manifest.json').read_text())
        assert manifest['id'] == 'wujie-sync' and manifest['version'] == version
        assert digest(source/f'wujie-sync-{version}.zip') == release['zipSha256']
        destination = root/'stable'/version
        assert not destination.is_symlink()
        if destination.exists():
            assert all((destination/p.name).is_file() and digest(destination/p.name) == digest(p) for p in source.iterdir())
    documents = ['releases.json', 'alpha/releases.json', 'alpha/latest.json', 'index.html', 'alpha/index.html']
    before = {name:(root/name).read_bytes() for name in documents}
    backup = pathlib.Path('/var/backups/wujie-download-index')/datetime.datetime.now(datetime.timezone.utc).strftime('domain-%Y%m%dT%H%M%S%fZ')
    backup.mkdir(parents=True, mode=0o700)
    for name, data in before.items():
        target = backup/name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    for release in records:
        destination = root/'stable'/release['version']
        if not destination.exists():
            destination.parent.mkdir(exist_ok=True)
            shutil.copytree(stage/'stable'/release['version'], destination)
            destination.chmod(0o755)
            for file in destination.iterdir(): file.chmod(0o644)
    updated = {}
    for name, data in before.items():
        text = data.decode().replace('https://sync.wujiesync.cc/download/', 'https://user.wujiesync.cc/download/')
        if name == 'releases.json':
            combined = json.loads(text)
            assert combined['stable'] == records[0]['version'], 'Stable head changed; inspect before retrying'
            combined['releases'] = [r for r in combined['releases'] if r.get('channel') != 'Stable'] + records
            text = json.dumps(combined, ensure_ascii=False, indent=2) + '\n'
        if name == 'index.html':
            stable = records[0]
            text = text.replace('https://github.com/adventurer2008/obsidian-smart-sync-release-cn/releases/tag/'+stable['version'], stable['zipUrl'])
            text = text.replace('正式版发行入口保持不变。', '正式版与 Alpha 安装文件均由本站提供。').replace('前往原正式版下载页', '下载正式版安装包')
        updated[name] = text.encode()
    assert all((root/name).read_bytes() == data for name,data in before.items())
    written = []
    try:
        for name, data in updated.items():
            target = root/name
            assert not target.is_symlink()
            temp = target.with_name('.'+target.name+'.domain-tmp')
            assert not temp.exists() and not temp.is_symlink()
            temp.write_bytes(data); temp.chmod(0o644)
            os.replace(temp, target); written.append(name)
    except BaseException:
        for name in written: (root/name).write_bytes(before[name])
        raise
    print(json.dumps({'backup':str(backup),'stableVersions':[r['version'] for r in records],'updatedIndexes':documents}))

if __name__ == '__main__': main()
