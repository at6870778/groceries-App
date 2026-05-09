package com.khanago.grocery.order.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.khanago.grocery.order.Order;
import com.khanago.grocery.order.OrderItem;
import com.khanago.grocery.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class BillService {

    private final OrderRepository orderRepository;

    public byte[] generateBill(Long orderId) throws Exception {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(outputStream);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc);

        PdfFont boldFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont regularFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        PdfFont smallFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

        // Header
        Paragraph header = new Paragraph("ORDER RECEIPT")
                .setFont(boldFont)
                .setFontSize(20)
                .setTextAlignment(TextAlignment.CENTER);
        document.add(header);

        Paragraph subheader = new Paragraph("Khanago - Hyperlocal Grocery Delivery")
                .setFont(regularFont)
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER);
        document.add(subheader);

        document.add(new Paragraph("\n"));

        // Order Details
        Paragraph orderDetails = new Paragraph()
                .setFont(boldFont)
                .setFontSize(11)
                .add("Order Details\n")
                .setTextAlignment(TextAlignment.LEFT);
        document.add(orderDetails);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");
        String orderDate = order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : "N/A";

        Table detailsTable = new Table(2).setWidth(500);
        addTableRow(detailsTable, "Order ID", "#" + order.getId(), boldFont, regularFont);
        addTableRow(detailsTable, "Order Date", orderDate, boldFont, regularFont);
        addTableRow(detailsTable, "Status", order.getStatus().toString(), boldFont, regularFont);
        addTableRow(detailsTable, "Payment Mode", order.getPaymentMode().toString(), boldFont, regularFont);
        document.add(detailsTable);

        document.add(new Paragraph("\n"));

        // Customer Details
        Paragraph customerHeading = new Paragraph()
                .setFont(boldFont)
                .setFontSize(11)
                .add("Delivery Address\n");
        document.add(customerHeading);

        Table customerTable = new Table(2).setWidth(500);
        addTableRow(customerTable, "Name", order.getCustomer().getFullName(), boldFont, regularFont);
        addTableRow(customerTable, "Phone", order.getCustomer().getPhone(), boldFont, regularFont);
        if (order.getAddress() != null) {
            String addressStr = order.getAddress().getLine1() + 
                    (order.getAddress().getLine2() != null ? ", " + order.getAddress().getLine2() : "");
            addTableRow(customerTable, "Address", addressStr, boldFont, regularFont);
            addTableRow(customerTable, "City", order.getAddress().getCity(), boldFont, regularFont);
            addTableRow(customerTable, "Postal Code", order.getAddress().getPostalCode(), boldFont, regularFont);
        }
        document.add(customerTable);

        document.add(new Paragraph("\n"));

        // Items Table
        Paragraph itemsHeading = new Paragraph()
                .setFont(boldFont)
                .setFontSize(11)
                .add("Items Ordered");
        document.add(itemsHeading);

        Table itemsTable = new Table(new float[]{3, 1, 1, 1}).setWidth(500);
        addHeaderRow(itemsTable, new String[]{"Item", "Qty", "Price", "Total"}, boldFont);

        for (OrderItem item : order.getOrderItems()) {
            addItemRow(itemsTable, 
                    item.getProductName(),
                    String.valueOf(item.getQuantity()),
                    "Rs " + item.getUnitPrice(),
                    "Rs " + item.getLineTotal(),
                    regularFont);
        }

        document.add(itemsTable);

        document.add(new Paragraph("\n"));

        // Amount Summary
        Table amountTable = new Table(2).setWidth(300);
        amountTable.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.RIGHT);
        
        addTableRow(amountTable, "Subtotal", "Rs " + order.getSubtotal(), boldFont, regularFont);
        addTableRow(amountTable, "Delivery Fee", "Rs " + order.getDeliveryFee(), boldFont, regularFont);
        addTableRow(amountTable, "Total Amount", "Rs " + order.getTotalAmount(), boldFont, boldFont);

        document.add(amountTable);

        document.add(new Paragraph("\n\n"));

        // Footer
        Paragraph footer = new Paragraph("Thank you for your order! Track your delivery in the app.")
                .setFont(smallFont)
                .setFontSize(9)
                .setTextAlignment(TextAlignment.CENTER);
        document.add(footer);

        document.close();
        return outputStream.toByteArray();
    }

    private void addTableRow(Table table, String label, String value, PdfFont labelFont, PdfFont valueFont) {
        Paragraph labelPara = new Paragraph(label).setFont(labelFont).setFontSize(10);
        Paragraph valuePara = new Paragraph(value).setFont(valueFont).setFontSize(10);
        table.addCell(labelPara);
        table.addCell(valuePara);
    }

    private void addHeaderRow(Table table, String[] headers, PdfFont font) {
        for (String header : headers) {
            Paragraph para = new Paragraph(header)
                    .setFont(font)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER);
            table.addCell(para);
        }
    }

    private void addItemRow(Table table, String name, String qty, String price, String total, PdfFont font) {
        table.addCell(new Paragraph(name).setFont(font).setFontSize(9));
        table.addCell(new Paragraph(qty).setFont(font).setFontSize(9).setTextAlignment(TextAlignment.CENTER));
        table.addCell(new Paragraph(price).setFont(font).setFontSize(9).setTextAlignment(TextAlignment.RIGHT));
        table.addCell(new Paragraph(total).setFont(font).setFontSize(9).setTextAlignment(TextAlignment.RIGHT));
    }
}
