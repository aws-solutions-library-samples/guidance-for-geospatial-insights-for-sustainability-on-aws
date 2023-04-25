import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as glue from "aws-cdk-lib/aws-glue";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as origins from "aws-cdk-lib/aws-cloudfront-origins"
import * as kms from "aws-cdk-lib/aws-kms"
import { Aspects } from "aws-cdk-lib"
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag"
export class GeospatialETLStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    Aspects.of(this).add(new AwsSolutionsChecks())

    const loggingBucket = new s3.Bucket(this, "loggingBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ]
        }
      ]
    })

    const etlBucket = new s3.Bucket(this, "etlBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ]
        }
      ],
      serverAccessLogsBucket: loggingBucket
    });

    const imageBucket = new s3.Bucket(this, "imageBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ]
        }
      ],
      serverAccessLogsBucket: loggingBucket
    });
   
    const CDNDistribution = new cloudfront.Distribution(this, 'distro',{
      defaultBehavior:{
        origin: new origins.S3Origin(imageBucket),
      },
      logBucket: loggingBucket,
      enableLogging: true
    })

    etlBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [etlBucket.bucketArn + "/*"],
        conditions: {
          "StringEquals": {
            "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${CDNDistribution.distributionId}`,
          },
        },
      })
    );

    const glueDatabaseName = "geospatialgluedb";

    const encryptionKey = new kms.Key(this, 'Key', {
      enableKeyRotation: true,
    });

    const encryptionAtRestProperty: glue.CfnDataCatalogEncryptionSettings.EncryptionAtRestProperty = {
      catalogEncryptionMode: 'catalogEncryptionMode',
      sseAwsKmsKeyId: encryptionKey.keyId,
    };

    const database = new glue.CfnDatabase(this, "geospatialGlueDatabase", {
      catalogId: this.account,
      databaseInput: {
        locationUri: `s3://${etlBucket.bucketName}/`,
        name: glueDatabaseName,
      },
    })

    const table = new glue.CfnTable(this, "geospatialGlueTable", {
      catalogId: this.account,
      databaseName: glueDatabaseName,
      tableInput: {
        description: "Table for the geo data outputs",
        name: "geospatialtable",
        storageDescriptor: {
          location: `s3://${etlBucket.bucketName}/processed`,
          inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          serdeInfo: {
            serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
          },
          columns: [
            {
              name: "bucket_name",
              type: "string",
            },
            {
              name: "supplier_name",
              type: "string",
            },
            {
              name: "supplier_id",
              type: "int",
            },
            {
              name: "AOI_name",
              type: "string",
            },
            {
              name: "AOI_id",
              type: "string",
            },
            {
              name: "AOI_bbox_geojson",
              type: "string",
            },
            {
              name: "AOI_centroid_coord",
              type: "struct<lat:float,lng:float>",
            },
            {
              name: "year",
              type: "string",
            },
            {
              name: "month",
              type: "string",
            },
            {
              name: "week",
              type: "string",
            },
            {
              name: "quarter",
              type: "string"
            },
            {
              name: "year_quarter",
              type: "string"
            },
            {
              name: "eoj_id",
              type: "string",
            },
            {
              name: "eoj_source_satellite",
              type: "struct<Name:string,Description:string,DescriptionPageUrl:string>",
            },
            {
              name: "eoj_selected_observation_id",
              type: "string",
            },
            {
              name: "eoj_selected_observation_day",
              type: "string",
            },
            {
              name: "eoj_selected_observation_timestamp",
              type: "string",
            },
            {
              name: "eoj_selected_observation_crs",
              type: "string",
            },
            {
              name: "baseline_spec",
              type: "struct<supplier_name:string,AOI_name:string,year:string,month:string>"
            },
            {
              name: "eoj_ndvi_avg",
              type: "float",
            },
            {
              name: "eoj_ndvi_avg_normalized",
              type: "float"
            },
            {
              name: "eoj_ndvi_full_discrete_distribution_abs_frequency",
              type: "struct<ndvi_abs_frequency:struct<Bucket1:int,Bucket2:int,Bucket3:int,Bucket4:int,Bucket5:int,Bucket6:int,Bucket7:int,Bucket8:int,Bucket9:int,Bucket10:int>>",
            },
            {
              name: "eoj_ndvi_avg_anomaly_perc",
              type: "float"
            },
            {
              name: "eoj_ndvi_loss_area",
              type: "float"
            },
            {
              name: "eoj_ndvi_gain_area",
              type: "float"
            },
            {
              name: "baseline_visible_band_raster_geotiff_prefix",
              type: "string",
            },
            {
              name: "baseline_visible_band_raster_png_prefix",
              type: "string",
            },
            {
              name: "baseline_ndvi_raster_geotiff_prefix",
              type: "string",
            },
            {
              name: "baseline_ndvi_raster_png_prefix",
              type: "string",
            },
            {
              name: "baseline_year_quarter",
              type: "string"
            }
          ],
        },
      },
    }).addDependsOn(database);


    const barChartTable = new glue.CfnTable(this, "geospatialGlueBarChartTable", {
      catalogId: this.account,
      databaseName: glueDatabaseName,
      tableInput: {
        description: "Table for the geo data barchart data",
        name: "geospatialtable-barchart",
        storageDescriptor: {
          location: `s3://${etlBucket.bucketName}/barchart`,
          inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          serdeInfo: {
            serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
          },
          columns: [
            {
              name: "ndvi_bin",
              type: "string",
            },
            {
              name: "value",
              type: "float",
            },
            {
              name: "type",
              type: "string",
            },
            {
              name: "bucket",
              type: "float",
            },
            {
              name: "supplier_name",
              type: "string",
            },
            {
              name: "AOI_name",
              type: "string",
            },
            {
              name: "year_quarter",
              type: "string",
            },
          ],
        },
      },
    }).addDependsOn(database);

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `GeospatialETLStack/loggingBucket/Resource`,
      [
        {
          id: "AwsSolutions-S1",
          reason: "This bucket is the logging bucket & therefore doesnt need its own logs"
        }
      ]
    )

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `GeospatialETLStack/distro/Resource`,
      [
        {
          id: "AwsSolutions-CFR4",
          reason: "This distro is only for showcasing the dashboard images"
        }
      ]
    )

    new cdk.CfnOutput(this, 'CloudfrontURL', { value: CDNDistribution.distributionDomainName })
    new cdk.CfnOutput(this, 'S3DataBucketName', {value: etlBucket.bucketName})
    new cdk.CfnOutput(this, 'S3ImageBucketName', {value: imageBucket.bucketName})
  }

 
}
