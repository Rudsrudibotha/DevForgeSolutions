import 'package:dio/dio.dart';
import '../database/local_db.dart';

class SyncRepository {
  final Dio http; // inject
  final LocalDb db; // Drift database
  
  SyncRepository(this.http, this.db);

  Future<void> syncDown(String schoolId) async {
    // pull deltas (If-Modified-Since / ETags)
    final r = await http.get("/api/mobile/sync", queryParameters: {"school": schoolId});
    await db.transaction(() async {
      // upsert students, classes, attendance, invoices ...
    });
  }
  
  Future<void> syncUp() async {
    // push pending local mutations when online
  }
}