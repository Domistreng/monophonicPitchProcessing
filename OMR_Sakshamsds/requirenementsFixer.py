with open("OMR_Sakshamsds/requirements.txt") as infile, open("OMR_Sakshamsds/requirements_pip.txt", "w") as outfile:
    for line in infile:
        line = line.strip()
        if line.startswith("#") or not line:
            continue
        # Split on "=" and take only the first two parts (name and version)
        parts = line.split("=")
        if len(parts) >= 2:
            pkg, ver = parts[0], parts[1]
            outfile.write(f"{pkg}=={ver}\n")