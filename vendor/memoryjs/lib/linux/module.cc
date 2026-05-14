#include <node.h>
#include <vector>
#include <cstring>
#include "module.h"
#include "process.h"
#include "memoryjs.h"
#include <cinttypes>

std::vector<module::Module> module::getModules(pid_t processId, const char**  errorMessage) {
    std::vector<Module> modules;
    char prev_pathname[4096] = "unknown\0";

    char maps_path[4096];
    snprintf(maps_path, sizeof(maps_path), "/proc/%d/maps", processId);
    FILE *f = fopen(maps_path, "r");

    if (f == NULL) {
        *errorMessage = "cannot open /proc/.../maps";
        return modules;
    }

    size_t len = 0;
    char *line = NULL;
    ssize_t rc = 0;
    while ((rc = getline(&line, &len, f)) != -1) {
        if (rc < 1) {
            continue;
        }
        line[rc-1] = '\0';

        // Skip '[heap]', '[stack]', etc.
        // Probably don't need these right now.
        if (strchr(line, '[') != NULL) {
            continue;
        }

        Module result;

        sscanf(line, "%" SCNxPTR "-%" SCNxPTR " %31s %llx %x:%x %llu", &result.start,
              &result.end, result.permissions, &result.offset,
              &result.dev_major, &result.dev_minor, &result.inode);

        // If the line doesn't have a path, simply add a dummy value to pathname.
        if (strchr(line, '/') != NULL) {
            strcpy(prev_pathname, strchr(line, '/'));
        }
        strcpy(result.pathname, prev_pathname);

        modules.push_back(result);
    }
    free(line);
    fclose(f);

    return modules;
}

module::Module module::findModule(const char* moduleName, pid_t processId, const char** errorMessage) {
    module::Module result;
    bool found = false;

    char maps_path[4096];
    snprintf(maps_path, sizeof(maps_path), "/proc/%d/maps", processId);
    FILE *f = fopen(maps_path, "r");

    if (f == NULL) {
        *errorMessage = "cannot open /proc/.../maps";
        return result;
    }

    size_t len = 0;
    char *line = NULL;
    ssize_t rc = 0;
    while ((rc = getline(&line, &len, f)) != -1) {
        // Remove trailing \n
        if (rc < 1) {
            continue;
        }
        line[rc-1] = '\0';

        // Search if the moduleName appears *anywhere* in the line
        if (strstr(line, moduleName) == NULL) {
            continue;
        }

        sscanf(line, "%" SCNxPTR "-%" SCNxPTR " %31s %llx %x:%x %llu", &result.start,
              &result.end, result.permissions, &result.offset,
              &result.dev_major, &result.dev_minor, &result.inode);

        strcpy(result.pathname, strchr(line,'/'));

        found = true;
        break;
    }
    free(line);
    fclose(f);

    if (!found) {
        *errorMessage = "unable to find module";
        printf("did not find module %s for pid %d\n", moduleName, processId);
        return result;
    }

    return result;

}

const char* get_process_name_by_pid(const int pid)
{
    char* name = (char*)calloc(1024,sizeof(char));
    if(name){
        sprintf(name, "/proc/%d/comm",pid);
        FILE* f = fopen(name,"r");
        if(f){
            size_t size;
            size = fread(name, sizeof(char), 1024, f);
            if(size>0){
                if('\n'==name[size-1])
                    name[size-1]='\0';
            }
            fclose(f);
        }
    }
    return name;
}

char* module::getFilePath(pid_t processId)
{
  char *path = new char[150];

  sprintf(path, "/proc/%d/cwd", processId);
  readlink(path, path, 150);
  sprintf(path, "%s/%s", path, get_process_name_by_pid(processId));

  return path;
}
 