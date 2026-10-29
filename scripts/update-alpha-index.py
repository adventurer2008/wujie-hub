"""Rebuild public Alpha indexes from complete immutable version directories."""
import argparse
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil

def prepare(root):
    root = root.resolve(strict=True)
    alpha = root / 'alpha'
    releases = []
    for directory in alpha.iterdir():
        if not re.fullmatch(r'\d+\.\d+\.\d+-alpha\.\d+', directory.name):
            continue
        if directory.is_symlink() or not directory.is_dir():
            raise ValueError('Unsafe version directory: ' + directory.name)
        metadata = directory / 'release.json'
        if not metadata.is_file():
            raise ValueError('Incomplete Alpha: ' + directory.name)
        release = json.loads(metadata.read_text(encoding='utf-8-sig'))
        if release.get('id') != 'wujie-sync' or release.get('version') != directory.name or release.get('channel') != 'Alpha':
            raise ValueError('Alpha identity mismatch: ' + directory.name)
        expected_base = 'https://user.wujiesync.cc/download/alpha/' + directory.name + '/'
        legacy_base = 'https://sync.wujiesync.cc/download/alpha/' + directory.name + '/'
        if release.get('baseUrl') not in (expected_base, legacy_base):
            raise ValueError('Unexpected download base: ' + directory.name)
        for filename in ['manifest.json', 'main.js', 'styles.css']:
            file = directory / filename
            if file.is_symlink() or not file.is_file():
                raise ValueError('Missing/unsafe file: ' + str(file))
            digest = hashlib.sha256(file.read_bytes()).hexdigest()
            if release.get('sha256', {}).get(filename) != digest:
                raise ValueError('Digest mismatch: ' + str(file))
        manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8-sig'))
        if manifest.get('id') != 'wujie-sync' or manifest.get('version') != directory.name:
            raise ValueError('Manifest mismatch: ' + directory.name)
        # Keep immutable version metadata intact; publish indexes on the new host.
        release['baseUrl'] = expected_base
        for key in ('zipUrl', 'checksumUrl'):
            if isinstance(release.get(key), str) and release[key].startswith(legacy_base):
                release[key] = expected_base + release[key][len(legacy_base):]
        releases.append(release)
    if not releases:
        raise ValueError('No complete Alpha versions')
    # Numeric ordering also handles alpha.10 after alpha.9, independent of upload time.
    def version_key(release):
        return tuple(map(int, re.fullmatch(r'(\d+)\.(\d+)\.(\d+)-alpha\.(\d+)', release['version']).groups()))
    releases.sort(key=version_key, reverse=True)
    latest = releases[0]['version']
    combined = json.loads((root / 'releases.json').read_text(encoding='utf-8-sig'))
    stable = [r for r in combined.get('releases', []) if r.get('channel') == 'Stable']
    combined['latestAlpha'] = latest
    combined['releases'] = releases + stable
    index = {'schemaVersion': 1, 'pluginId': 'wujie-sync', 'channel': 'Alpha', 'latest': latest, 'releases': releases}
    latest_only = dict(index, releases=releases[:1])
    return {
        'alpha/releases.json': index,
        'alpha/latest.json': latest_only,
        'releases.json': combined,
    }, releases

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='/var/www/wujie-download')
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--backup-dir')
    parser.add_argument('--import-dir')
    args = parser.parse_args()
    root = pathlib.Path(args.root).resolve(strict=True)
    if args.import_dir:
        if not args.write:
            raise ValueError('--import-dir requires --write')
        source = pathlib.Path(args.import_dir).resolve(strict=True)
        if not source.is_relative_to(pathlib.Path('/home/app/wujie-alpha-upload')) or not re.fullmatch(r'\d+\.\d+\.\d+-alpha\.\d+', source.name):
            raise ValueError('Unexpected upload location')
        release = json.loads((source / 'release.json').read_text())
        if release.get('version') != source.name or release.get('id') != 'wujie-sync':
            raise ValueError('Incoming identity mismatch')
        allowed = {'main.js','manifest.json','styles.css','release.json','SHA256SUMS.txt','LICENSE','THIRD-PARTY-NOTICES.md',f'wujie-sync-{source.name}.zip'}
        for file in source.iterdir():
            if file.is_symlink() or not file.is_file() or file.name not in allowed:
                raise ValueError('Unexpected uploaded file')
        for filename in ['main.js','manifest.json','styles.css']:
            if hashlib.sha256((source / filename).read_bytes()).hexdigest() != release.get('sha256',{}).get(filename):
                raise ValueError('Incoming digest mismatch')
        manifest = json.loads((source / 'manifest.json').read_text())
        if manifest.get('id') != 'wujie-sync' or manifest.get('version') != source.name:
            raise ValueError('Incoming manifest mismatch')
        destination = root / 'alpha' / source.name
        if destination.exists():
            for file in source.iterdir():
                if not (destination / file.name).is_file() or file.read_bytes() != (destination / file.name).read_bytes():
                    raise ValueError('Published version is immutable')
        else:
            shutil.copytree(source, destination)
            destination.chmod(0o755)
            for file in destination.iterdir():
                file.chmod(0o644)
    documents, releases = prepare(root)
    if args.write:
        if not args.backup_dir:
            raise ValueError('--backup-dir required for write')
        backup = pathlib.Path(args.backup_dir) / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        backup.mkdir(parents=True, mode=0o700)
        for relative in documents:
            target = root / relative
            if target.is_symlink():
                raise ValueError('Unsafe index path')
            if target.exists():
                saved = backup / relative
                saved.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(target, saved)
        written = []
        try:
            for relative, document in documents.items():
                target = root / relative
                temporary = target.with_name('.' + target.name + '.index-tmp')
                if temporary.exists() or temporary.is_symlink():
                    raise ValueError('Existing temporary index; inspect first')
                temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                temporary.chmod(0o644)
                os.replace(temporary, target)
                written.append(relative)
        except BaseException:
            for relative in written:
                saved = backup / relative
                if saved.exists():
                    shutil.copyfile(saved, root / relative)
            raise
    print(json.dumps({'written': args.write, 'versions': [r['version'] for r in releases], 'latest': releases[0]['version']}))

if __name__ == '__main__':
    main()
