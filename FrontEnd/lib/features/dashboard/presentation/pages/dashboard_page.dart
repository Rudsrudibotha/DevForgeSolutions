import 'package:flutter/material.dart';
import 'package:material_design_icons_flutter/material_design_icons_flutter.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
          ),
        ],
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        children: [
          _DashboardCard(
            title: 'Students',
            icon: MdiIcons.accountGroup,
            onTap: () {},
          ),
          _DashboardCard(
            title: 'Attendance',
            icon: MdiIcons.checkboxMarkedCircle,
            onTap: () {},
          ),
          _DashboardCard(
            title: 'Staff',
            icon: MdiIcons.accountTie,
            onTap: () {},
          ),
          _DashboardCard(
            title: 'Invoices',
            icon: MdiIcons.fileDocument,
            onTap: () {},
          ),
          _DashboardCard(
            title: 'Payments',
            icon: MdiIcons.creditCard,
            onTap: () {},
          ),
          _DashboardCard(
            title: 'Contracts',
            icon: MdiIcons.fileSignature,
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback onTap;

  const _DashboardCard({
    required this.title,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: Theme.of(context).primaryColor),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }
}