# Methods by question

How to answer each kind of question about a built desktop app. Each line is "to find X, do Y". Where an REA tool does the step, use it first: its output carries an evidence ID that the ledger can cite. Load the tools named here with one `ToolSearch select:` call before the first REA call, then call `binary_session` once and plan around `result.tool_availability`.

## The app's parts

- To list every part, open the `.app` folder with `open_binary`, run `inspect_artifact` with `detail: "summary"`, and pass its inventory evidence to `project_apple_application_graph`. It returns the main executable, frameworks, helpers, extensions and services in one record.
- To read what each part declares about itself (executable name, identifier, service type), run `inspect_plist` on every `info_plist_path` the graph lists.
- To see one executable's architecture, sections and linked libraries, use `list_architectures` and `inspect_macho` (`detail: "summary"`), then `inspect_analysis_view` kind `macho` for the full page.
- To find the UI layout and its links to code, use `decode_interface_builder`; for bundled images and archived objects, `inspect_asset_catalog` and `inspect_keyed_archive`.
- To find code merged into the main executable (a Rust or C library with no separate file), look for two independent signs: `search_strings` for crate names, source paths (`.rs`, `.cargo/registry`) or library version text, and `search_procedures` for that library's function names. Example: a reader app showed `/rustc/` paths and parser crate names in strings, and matching functions sat in one address range.

## What loads or starts what

- To trace library loading across every executable in the bundle, run `trace_dylib_resolution` on the open `.app`.
- To find helper processes and extensions and the names they are reached by, read the extension, XPC service and launchd entries from `project_apple_application_graph`, then `inspect_plist` each one (`NSExtension`, `MachServices`, `Program`).
- To see one executable's load commands and dependencies in detail, use `inspect_analysis_view` kind `macho`, facet `dependencies` or `load_commands`.
- To find code that runs before the main entry (initializers, static setup), look at the initializer list in the `load_commands` facet and run `analyze_function` on each initializer address separately from the feature path.
- To find libraries loaded only when a feature runs, run `capture_process_scenario` twice, once without the feature and once with it, and compare with `compare_process_captures`.

## One feature end to end

- To find where a feature starts, run `trace_feature` with a visible string from that feature (a menu title, button label, error text). One call returns every match, its references and the functions that contain them.
- To start from a menu item or button, run `trace_native_ui_action` with its action selector (for example `openDocument:`) or its Interface Builder object ID.
- To read a function, call `analyze_function` once. It returns pseudocode, assembly, callers, callees, strings and the control-flow graph together.
- To connect the entry point to the final effect (file write, screen update), run `trace_call_path` with `start` and `goal`, then `build_call_path` from the `analyze_function` records along the way.
- To narrow a large candidate set, capture the app doing the feature and doing a near-identical action without it (same window, same document, three runs each) with `capture_process_scenario`, and keep the functions that appear only in the feature runs.

## Who calls whom

- To list callers and callees of one function, read them from its `analyze_function` record; for a wider view use `get_call_graph` on the address.
- To resolve an indirect call (function pointer, method table, jump table), run `resolve_native_call_targets` on the call-site address and `inspect_native_api` on the containing function.
- To resolve Objective-C and Swift method dispatch, use `inspect_native_dispatch_metadata` and `get_objc_classes` to match the selector or table slot to its implementation.
- To confirm a call edge actually happens, run `observe_native_calls` with breakpoints on the callee and read the caller from each recorded hit.

## Data handed over

- To see what a function passes on and where a value comes from, run `trace_native_values` on it. It follows arguments, returns and constants across resolved calls.
- To read the layout of a struct, record or enum crossing a boundary, use `inspect_native_data_type` with the type or a typed data address; for Swift types use `analyze_swift_types` with a name `pattern`.
- To read actual argument values at runtime, run `observe_native_calls` on the receiving function. Each hit records arguments and the receiver's class.
- To read what the app stores on disk, open a copy of its database with `inspect_sqlite_database` and its settings with `inspect_plist`.
- To recover a struct's fields, collect the offsets every consumer function reads from the same pointer, across several `analyze_function` records, and keep unread offsets marked unknown.

## Threads and timing

- To check whether the app allows runtime observation, run `inspect_signature` first. If a debugger cannot attach, use `capture_process_scenario` and keep the thread question open with `record_unknown`.
- To learn which thread runs each step, run `observe_native_calls` on the step functions. Each hit carries the thread identity; group hits by thread and keep their order.
- To capture a whole run with files touched and timing, use `capture_process_scenario` with `timeout_ms`, `idle_timeout_ms` and `filesystem_observation_paths` set to the documents and app folders.
- To compare two runs (small vs large document, first vs second open), use `compare_process_captures`, passing a `trace_spec` when event order matters.
- To see the window and control tree while it runs, use `observe_native_ui` with a small `max_nodes` (50 to 100), or `capture_native_ui_scenario` to drive press, scroll and wait steps.

## Values and limits

- To find a size, count or timeout, start at the call that consumes it (allocation, loop bound, timer API) and run `trace_native_values` on that function to see the constant and the arithmetic feeding it.
- To read a constant built over several instructions or loaded from a table, use `inspect_native_instruction` on each producing instruction, then `read_bytes` with `address_to_file_offset` on the referenced data.
- To state a limit exactly, read the comparison and both branches in `analyze_function`: width, signed or unsigned, and whether the bound is inclusive.
- To find case values of a switch, use `inspect_native_api` on the function.
- To find configured values, read `inspect_plist` and `search_strings` for settings keys, then follow `xrefs` to where each key is read.

## Checking a conclusion

- To check a static claim, get a second static view: callers through `xrefs`, the path through `trace_call_path`, or the value through `trace_native_values`.
- To check a static claim against a run, capture it with `capture_process_scenario` or `observe_native_calls` and link the two with `correlate_static_and_runtime`.
- To report that something is absent, state the search: the query, the parts searched and the runs made. Confirm the same query finds a known-present item first.
- To keep each open question, use `record_unknown` with `required_authority` and `recommended_probes`; close it with `update_unknown` and `verify_unknown_resolution`; before finishing, compare `list_unknowns` with the ledger and save everything with `export_evidence_bundle` before `close_binary`.
- To check a rebuild against the original, compare them with `compare_functions` or `compare_process_captures`, then state each claim in `verify_reconstruction`.

## Possibilities worth checking

Desktop apps often share structural patterns. Each line names one that many apps have and how to check whether this app has it. None is assumed: confirm or rule out each with evidence, and record the ones you could not settle with `record_unknown`.

### The app's parts

- Look for several program modes in one executable (GUI app, command-line tool, background helper) chosen by arguments or launch name. Check `search_strings` for flag and usage text, and `inspect_plist` for helper entries whose `Program` points back to the main executable.
- Check whether a helper, XPC service or extension is largely a copy of the main program or shares a framework with it. Compare matching functions with `compare_functions`, or the files with `compare_artifacts`, before documenting them as separate designs.
- Look for an engine written in another language (Rust, C++, Go) linked into the same process. Signs are source paths, crate or namespace names and runtime error text in `search_strings`, plus a dense address range of functions with a different naming style in `search_procedures`.
- Look for well-known C libraries compiled into the executable (database engine, compression, XML, image or font codecs). Their version banners and error messages in `search_strings` usually name them, which saves reading their code.
- Check the runtime metadata that survives symbol stripping: `analyze_swift_types` and `get_objc_classes` often name types and methods before any function is read by hand.
- Check whether windows and menus come from Interface Builder files or are built in code. `decode_interface_builder` covers the first case; for the second, look for view class names and layout strings with `search_strings`.
- Look for bundled data that drives behavior: default settings, templates, schema files, models, localization tables. `inspect_artifact`, `inspect_asset_catalog` and `inspect_keyed_archive` list and decode them.
- Check the capabilities the app declares (file access, network, sandbox containers, app groups) with `inspect_signature`. Each declared capability hints at a subsystem worth locating.

### What loads or starts what

- Look for setup that runs before `main`: static initializers and load-time methods that register handlers, create shared objects or configure logging. Read the initializer list in the `load_commands` facet and run `analyze_function` on each entry.
- Check for frameworks or plug-ins opened on demand by name rather than linked. Compare framework and bundle names found by `search_strings` with the linked set from `trace_dylib_resolution`, then confirm with a with-feature and without-feature `capture_process_scenario`.
- Look for a startup step that fills a table of handlers keyed by name, file extension or command ID. Find the key strings with `search_strings`, then follow `xrefs` to the code that stores them.
- Check for a launchd agent, login item or long-running helper that the app starts and talks to. Read the launchd and XPC entries from `project_apple_application_graph` and the `MachServices` key with `inspect_plist`.
- Check the document types, exported file types and URL schemes the app declares (`CFBundleDocumentTypes`, `UTExportedTypeDeclarations`, `CFBundleURLTypes`) with `inspect_plist`. Each one names an entry path worth tracing.

### One feature end to end

- Check whether the same file format is read by two separate code paths kept for different purposes, such as a light reader for previews, thumbnails or search indexing and a full one for editing. Run `trace_feature` on format-specific text (element names, magic bytes, error messages) and see whether the matches fall in more than one function cluster. Example: a preview extension may carry its own reduced reader.
- Look for a fast path and a fallback path for the same feature (small versus large input, cached versus fresh, preview versus full). Run `capture_process_scenario` with a small and a large input and compare them with `compare_process_captures`.
- Look for a staged pipeline (read bytes, unpack container, parse, build model, lay out, draw) and map each stage to a function cluster. Use `trace_call_path` between stage entry points to confirm the order.
- Check whether menu and toolbar actions go through one central dispatcher keyed by command ID instead of one method per item. `inspect_native_api` on the candidate function lists its case values.
- Look for the feature's error and unsupported-input messages. `trace_feature` on that text often lands on the validation step that chooses the path.
- Check whether the app builds on the platform document architecture (for example `NSDocument` subclasses in `get_objc_classes`). If it does, open, save and autosave enter through known framework methods.

### Who calls whom

- Look for calls dispatched through tables: Swift witness tables and class vtables, Objective-C messages, Rust trait objects, C function-pointer structs. Resolve them with `resolve_native_call_targets` and `inspect_native_dispatch_metadata`.
- Check whether a function is registered as a callback or closure at one site and invoked later from another, often on another thread. Find the registration with `trace_native_values` and confirm the invoker with `observe_native_calls`.
- Look for hub functions: many callees and few callers usually means a router, many callers and few callees usually means shared state or a utility. Counts from `get_call_graph` help pick where to read first.
- Check for decoupled calls through notifications, observers or event streams, where sender and receiver never call each other directly. Find notification names with `search_strings` and follow `xrefs` to both the posting and the observing sites.
- Check for tail calls and inlined helpers in optimized builds before concluding that an edge is missing. The `analyze_function` assembly shows a final jump where source code had a call.

### Data handed over

- Look for data crossing a language boundary in a serialized format (JSON, property list, protocol buffers, CBOR) instead of native objects. Field or key names near the boundary function appear in `search_strings`, and `observe_native_calls` shows the buffer at the call.
- Check for a thin layer of exported C-callable functions between the UI side and the engine. Group them by a shared name prefix and read argument shapes (pointer plus length, opaque handle, out-pointer) with `trace_native_values`.
- Look for an engine object handed to the UI side as an opaque pointer that is created, used and released through matching calls. Trace the create and release pair with `trace_native_values` to find the object's lifetime.
- Check whether text changes encoding at the boundary, for example UTF-16 platform strings converted to UTF-8 for the engine. The conversion call marks where the crossing happens.
- Check whether helper processes receive dictionaries or messages with named keys. Find the key names with `search_strings` and the service names with `inspect_plist`.
- Look for app-owned storage with a schema or format version: databases, archives, cache folders. Read a copy with `inspect_sqlite_database` or `inspect_keyed_archive`, and look for the version value in the code that opens it.

### Threads and timing

- Look for work split between the main thread (UI) and background queues or worker threads (parsing, file reading, rendering). Group `observe_native_calls` hits by thread, and look for queue labels (reverse-DNS names) with `search_strings`.
- Check where results return to the main thread (dispatch to the main queue, run-loop perform). Those calls mark the boundary between background work and UI updates.
- Look for an engine that runs its own thread pool separate from the platform queues. Compare thread counts in `capture_process_scenario` runs on a small and a large input.
- Check for debounce and delay timers (typing, resizing, scrolling, autosave). Find callers of the timer API, then read the interval with `trace_native_values`.
- Look for request IDs or generation counters that let newer work replace older work that is still running. The comparison sits in the completion handler; read it with `analyze_function`.
- Check whether shared caches or models are guarded by a lock or confined to one queue. The guarding calls around each access show which.

### Values and limits

- Look for caches and size limits set as constants: cache capacity, maximum file size, chunk or page size, recursion depth. Start at the allocation, loop or comparison site and run `trace_native_values`.
- Check whether the same limit is enforced in two layers (UI and engine) with different values. Search for each constant on both sides of the boundary.
- Look for a divisor compiled as a multiply followed by a shift. `inspect_native_instruction` on the pair gives the multiplier and shift that recover it.
- Look for default settings registered at startup from a dictionary or a bundled property list. Read them with `inspect_plist` and `search_strings` for the keys, then follow `xrefs` to where each is read.
- Check for settings keys that code reads but no visible control sets. They often expose tuning values and size limits.
- Look for branches on the operating system version or the document format version. The comparison in `analyze_function` gives the exact threshold.

### Checking a conclusion

- Check whether a seemingly duplicated function is one library compiled into two executables. `compare_functions` on both copies settles it.
- Check whether the executable has more than one architecture slice with `list_architectures`. Slices can differ, so state which one a claim was read from.
- Check whether code found statically is reachable at all before documenting it as a feature. Confirm callers with `xrefs` and at least one run that executes it.
